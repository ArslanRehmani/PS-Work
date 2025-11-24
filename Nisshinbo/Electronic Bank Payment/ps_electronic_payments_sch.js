/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', '../lodash.js', 'N/file', './moment.js', 'N/runtime'], function(record, search, _, file, moment, runtime) {

    const PAYMENT_METHODS = {
        CORPORATE_CHECK: { id: '10', value: 'corporate_check', text: 'Corporate check (BAYCCP)', code: 'CCPBAY', checkType: '02' },
        CASHIER_CHECK: { id: '11', value: 'cashier_check', text: 'Cashier check (BAYCHQ)', code: 'CHQBAY', checkType: '02' },
        BANK_TRANSFER: { id: '9', value: 'bank_transfer', text: 'Bank Transfer-BAY', code: 'MEDIABAY', checkType: '  '}
    };

    const MY_PRODUCT = {
        'corporate_check': 'CORPCHEQUE',
        'cashier_check': 'CASHCHEQUE',
        'bank_transfer': 'MEDIACL'
    };

    const CHARGES_BORNE_BY = {
        1: "0",
        2: "1",
    };

    const CHECK_POINT = {
        "Mail": "MA",
        "Counter with Receipt": "CR",
        "Counter without Receipt": "CO",
        "Courier": "C",
        "Return to Customer": "RE",
        "Electronic": "E",
        "Counter with Receipt-Payin Slip": "CW",
        "Money Order-Return": "MR",
        "Money Order-Mail": "MM",
    };

    const WHT_PAYMENT_TYPE = {
        'Withhold at Source': 'หักภาษี ณ ที่จ่าย',
        'Pay Every Time': 'ออกภาษีให้ตลอดปี',
        'Pay One Time': 'ออกภาษีให้ครั้งเดียว',
        'Other': 'อิ่นๆ (โปรดระบุ)',
        'Withhold at Source (e-WHT)': 'หักภาษี ณ ที่จ่าย (e-WHT)',
        'Pay Every Time (e-WHT)': 'ออกภาษีให้ตลอดปี (e-WHT)',
        'Pay One Time (e-WHT)': 'ออกภาษีให้ครั้งเดียว (e-WHT)'
    };

    let batchReference = '';


    function execute(scriptContext) {
        const batchData = JSON.parse(runtime.getCurrentScript().getParameter({ name: 'custscript_batch_data' }));
        const paymentsData = JSON.parse(runtime.getCurrentScript().getParameter({ name: 'custscript_payments_data' }));
        const transactionIds = JSON.parse(runtime.getCurrentScript().getParameter({ name: 'custscript_transaction_ids' }));

        try {
            const paymentsTextFileId = createPaymentsTextFile(paymentsData, batchData);
            if (paymentsTextFileId) {
                const recId = createPaymentGeneratedRecord(paymentsTextFileId, batchData);
                markTransactionsAsProcessed(transactionIds);
                log.debug('Processing completed', { recId: recId, fileId: paymentsTextFileId });
            } else {
                log.error('Failed to create payments text file');
            }
        } catch (e) {
            log.error('Error in scheduled script', e);
        }
    }

    function createPaymentsTextFile(paymentsData, batchData) {
        try {
            log.debug('Payments Data', JSON.stringify(paymentsData));
            log.debug('Batch Data', JSON.stringify(batchData));
            const companyDetails = getCompanyDetails();

            let textData = '';

            // File Controller
            const hash = ''.padEnd(100, ' ');
            textData += `F01I${hash}\n`;

            // Batch Controller
            {
                const nowDateTime = new Date();
                let formattedDateTime = `${nowDateTime.getFullYear()}${(nowDateTime.getMonth()+1).toString().padStart(2, '0')}${(nowDateTime.getDate()+1).toString().padStart(2, '0')}${nowDateTime.getHours().toString().padStart(2, '0')}${nowDateTime.getMinutes().toString().padStart(2, '0')}`;
                log.debug('Formatted Date Time', formattedDateTime);
                const paymentMethodValue = Object.values(PAYMENT_METHODS).find(method => method.value === batchData.paymentMethod).code;
                batchReference = `${paymentMethodValue}${formattedDateTime}`.padEnd(20, ' ');
                let batchReferenceFromGCP = ''.padEnd(20, ' ');
                log.debug('Batch Reference ', batchReference);
                log.debug('Batch Reference length', batchReference.length);
                const companyBankAccount = batchData.companyBankAccount.padEnd(16, ' ');
                const currency = (batchData.currency).padEnd(3, ' ');
                const myProduct = MY_PRODUCT[batchData.paymentMethod].padEnd(10, ' ');
                const paymentDate = (new Date(batchData.paymentDate));
                paymentDate.setDate(paymentDate.getDate());
                const formattedPaymentDate = `${(paymentDate.getDate()+1).toString().padStart(2, '0')}${(paymentDate.getMonth() + 1).toString().padStart(2, '0')}${paymentDate.getFullYear()}`;
                const checkDupAccount = ' ';
                const totalTransactions = batchData.totalTransactions.toString().padStart(6, '0');
                const totalAmount = Math.abs(batchData.totalAmount).toFixed(2).padStart(20, '0');
                const numberOfRejectTransactions = ''.toString().padStart(6, '0');
                const totalRejectAmount = ''.toString().padStart(20, '0');
                textData += `B${batchReference}${batchReferenceFromGCP}${companyBankAccount}${currency}${myProduct}${formattedPaymentDate}${checkDupAccount}${totalTransactions}${totalAmount}${numberOfRejectTransactions}${totalRejectAmount}\n`;
            }

            // Transaction Detail
            paymentsData.forEach(function(payment) {
                const padOrTrim = (val, len) => {
                    val = val ? String(val) : '';
                    return val.length > len ? val.substring(0, len) : val.padEnd(len, ' ');
                };

                const transactionNumber = padOrTrim(payment.transactionNumber, 20);
                const customerReference = padOrTrim('', 20);
                const reference1 = padOrTrim('', 20);
                const reference2 = padOrTrim('', 60);
                const reference3 = padOrTrim('', 135);
                const transactionDetail = padOrTrim('', 255);
                const transactionCreditTime = padOrTrim('', 2);
                const serviceType = padOrTrim('', 2);
                const paymentAmount = parseFloat(payment.amount).toFixed(2).padStart(20, '0');
                const chargesBorneBy = CHARGES_BORNE_BY[payment.chargesBorneBy] ? CHARGES_BORNE_BY[payment.chargesBorneBy] : '0';
                const deliveryMode = CHECK_POINT[payment.checkPoint] ? CHECK_POINT[payment.checkPoint] : 'MA';
                const thirdPartyCode = padOrTrim('', 10);
                const filler = padOrTrim('', 6);
                const mandate = padOrTrim('', 10);

                const vendorId = padOrTrim(payment.vendorId, 16);
                const thirdPartyName = padOrTrim(payment.thirdPartyName, 200);
                const thirdPartyMailingName = padOrTrim(payment.thirdPartyName, 200);
                const thirdPartyAddress = padOrTrim(payment.thirdPartyAddress, 200);
                const thirdPartyMailingAddress = padOrTrim(payment.thirdPartyAddress, 200);
                const thirdPartyFaxNumber = padOrTrim(payment.fax, 25);
                const thirdPartyEmail = padOrTrim(payment.email, 150);
                const thirdPartyMobileNumber = padOrTrim(payment.phone, 25);
                const thirdPartybank = padOrTrim(payment.psTHTEntityBranch, 3);
                const thirdPartyBranch = padOrTrim(payment.bankBranch, 4);
                const thirdPartyAccountNumber = padOrTrim(payment.bankAccount, 16);
                const thirdPartyCurrency = padOrTrim('THB', 3);
                const thirdPartyBIC = padOrTrim(payment.swiftCode, 11);
                const thirdPartyIBAN = padOrTrim(`(${payment.psTHTEntityBranch} ${payment.bankAccount})`, 50);
                const bankBranch = padOrTrim(payment.bankBranch, 4);
                const paymentDetails = padOrTrim('', 255);
                const corpCheque = padOrTrim(Object.values(PAYMENT_METHODS).find(method => method.value === batchData.paymentMethod).checkType, 2);
                const taxId = padOrTrim(payment.taxId, 15);
                const controlCode = padOrTrim('', 15);
                const taxType = padOrTrim('', 5);
                const statusCode = padOrTrim('00', 2);
                const statusReason = padOrTrim('PAID', 35);
                const chequeNumber = padOrTrim(payment.checkId, 10);
                const chequeStatus = padOrTrim('00', 2);
                const chequeStatusUpdateDate = padOrTrim(payment.transactionDate, 8);
                const deliveryStatus = padOrTrim('00', 2);
                const deliveryStatusUpdateDate = padOrTrim(payment.transactionDate, 8);
                const transactionRef = padOrTrim('', 20);
                const thirdPartyBankCountry = padOrTrim('', 2);
                const paymentPurposeCose = padOrTrim('', 3);
                const paymentPurposeDescription = padOrTrim('', 140);
                // Calculate total length of the T line
                // Each variable's length (as padded above):
                // 'T' = 1
                // transactionNumber = 20
                // customerReference = 20
                // reference1 = 20
                // reference2 = 60
                // reference3 = 135
                // transactionDetail = 255
                // transactionCreditTime = 2
                // serviceType = 2
                // paymentAmount = 20
                // chargesBorneBy = 1
                // deliveryMode = 2
                // thirdPartyCode = 10
                // filler = 6
                // mandate = 10
                // vendorId = 16
                // thirdPartyName = 200
                // thirdPartyMailingName = 200
                // thirdPartyAddress = 200
                // thirdPartyMailingAddress = 200
                // thirdPartyFaxNumber = 25
                // thirdPartyEmail = 150
                // thirdPartyMobileNumber = 25
                // thirdPartybank = 3
                // thirdPartyBranch = 4
                // thirdPartyAccountNumber = 16
                // thirdPartyCurrency = 3
                // thirdPartyBIC = 11
                // thirdPartyIBAN = 50
                // bankBranch = 4
                // paymentDetails = 255
                // corpCheque = 2
                // taxId = 15
                // controlCode = 15
                // taxType = 5
                // statusCode = 2
                // statusReason = 35
                // chequeNumber = 10
                // chequeStatus = 2
                // chequeStatusUpdateDate = 8
                // deliveryStatus = 2
                // deliveryStatusUpdateDate = 8
                // transactionRef = 20
                // thirdPartyBankCountry = 2
                // paymentPurposeCose = 3
                // paymentPurposeDescription = 140
                // '\n' = 1

                // Sum:
                // 1 + 20 = 21
                // 21 + 20 = 41
                // 41 + 20 = 61
                // 61 + 60 = 121
                // 121 + 135 = 256
                // 256 + 255 = 511
                // 511 + 2 = 513
                // 513 + 2 = 515
                // 515 + 20 = 535
                // 535 + 1 = 536
                // 536 + 2 = 538
                // 538 + 10 = 548
                // 548 + 6 = 554
                // 554 + 10 = 564
                // 564 + 16 = 580
                // 580 + 200 = 780
                // 780 + 200 = 980
                // 980 + 200 = 1180
                // 1180 + 200 = 1380
                // 1380 + 25 = 1405
                // 1405 + 150 = 1555
                // 1555 + 25 = 1580
                // 1580 + 3 = 1583
                // 1583 + 4 = 1587
                // 1587 + 16 = 1603
                // 1603 + 3 = 1606
                // 1606 + 11 = 1617
                // 1617 + 50 = 1667
                // 1667 + 4 = 1671
                // 1671 + 255 = 1926
                // 1926 + 2 = 1928
                // 1928 + 15 = 1943
                // 1943 + 15 = 1958
                // 1958 + 5 = 1963
                // 1963 + 2 = 1965
                // 1965 + 35 = 2000
                // 2000 + 10 = 2010
                // 2010 + 2 = 2012
                // 2012 + 8 = 2020
                // 2020 + 2 = 2022
                // 2022 + 8 = 2030
                // 2030 + 20 = 2050
                // 2050 + 2 = 2052
                // 2052 + 3 = 2055
                // 2055 + 140 = 2195
                // 2195 + 1 = 2196

                // Total length: 2196

                textData += `T${transactionNumber}${customerReference}${reference1}${reference2}${reference3}${transactionDetail}${transactionCreditTime}${serviceType}${paymentAmount}${chargesBorneBy}${deliveryMode}${thirdPartyCode}${filler}${mandate}${vendorId}${thirdPartyName}${thirdPartyMailingName}${thirdPartyAddress}${thirdPartyMailingAddress}${thirdPartyFaxNumber}${thirdPartyEmail}${thirdPartyMobileNumber}${thirdPartybank}${thirdPartyBranch}${thirdPartyAccountNumber}${thirdPartyCurrency}${thirdPartyBIC}${thirdPartyIBAN}${bankBranch}${paymentDetails}${corpCheque}${taxId}${controlCode}${taxType}${statusCode}${statusReason}${chequeNumber}${chequeStatus}${chequeStatusUpdateDate}${deliveryStatus}${deliveryStatusUpdateDate}${transactionRef}${thirdPartyBankCountry}${paymentPurposeCose}${paymentPurposeDescription}\n`;

                const WHTransactions = getWithHoldingTaxTransactions(payment.transactionId);
                log.debug('WithHolding Tax Transactions', JSON.stringify(WHTransactions));
                log.debug('Company Details', JSON.stringify(companyDetails));
                WHTransactions.forEach(function(WHTransaction) {
                    // WithHolding Tax Line 
                    log.debug('WithHolding Tax Transaction', JSON.stringify(WHTransaction));
                    const typeOftax = '53';
                    const WHTPaymentType = WHT_PAYMENT_TYPE[WHTransaction.wht_condition] ? WHT_PAYMENT_TYPE[WHTransaction.wht_condition] : WHT_PAYMENT_TYPE['Other'];
                    const WHTPaymentTypeDesc = padOrTrim('', 35);
                    const sequenceFlag = padOrTrim('1', 1);
                    const custSeqMonth = padOrTrim('', 20);
                    const custSeqYear = padOrTrim('', 20);
                    const payerName = padOrTrim(payment.WHTSubsidiaryBranch, 200);
                    const payerAddress = padOrTrim(companyDetails.mainaddress_text, 200);
                    const payertaxId = padOrTrim(companyDetails.custrecord_ps_wht_vat_registration_no, 13);
                    const payeeName = padOrTrim(payment.thirdPartyName, 200);
                    const payeeAddress = padOrTrim(payment.thirdPartyAddress, 200);
                    const payeeTaxId = padOrTrim(payment.taxId, 13);
                    let itemDetails = '';
                    const itemLines = WHTransaction.items;
                    for(let i = 0; i < itemLines.length; i++) {
                        const incomeType1 = padOrTrim(`06${i+1}`, 3);
                        const WHTRate1 = padOrTrim(itemLines[i].rate, 3);
                        const WHTDesc1 = padOrTrim(itemLines[i].item, 35);
                        const incomeAmount1 = padOrTrim(parseFloat(itemLines[i].amount).toFixed(2), 20);
                        const WHAmount1 = padOrTrim(parseFloat(itemLines[i].amount * itemLines[i].rate).toFixed(2), 20);
                        const WHTDedeuctedDate1 = padOrTrim(moment(payment.transactionDate).format('DD/MM/YYYY'), 10);

                        itemDetails += `${incomeType1}${WHTRate1}${WHTDesc1}${incomeAmount1}${WHAmount1}${WHTDedeuctedDate1}`;
                    }
                    textData += `W${typeOftax}${WHTPaymentType}${WHTPaymentTypeDesc}${sequenceFlag}${custSeqMonth}${custSeqYear}${payerName}${payerAddress}${payertaxId}${payeeName}${payeeAddress}${payeeTaxId}${itemDetails}\n`;
                });
            });

            // Create .txt file
            const fileObj = file.create({
                name: `EBP|${batchReference.trim()}.txt`,
                fileType: file.Type.PLAINTEXT,
                contents: textData
            });
            fileObj.encoding = file.Encoding.WINDOWS_1252;
            fileObj.folder = 172;
            const fileId = fileObj.save();
            log.debug('File ID', fileId);

            log.debug('Text Data', textData);
            return fileId;
        } catch (e) {
            log.error('Error creating payments text file', e);
            throw e;
        }
    }

    function createPaymentGeneratedRecord(paymentsTextFileId, batchData) {
        const recordObj = record.create({
            type: 'customrecord_ps_payments_generated',
            isDynamic: true
        });
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_payment_file',
            value: paymentsTextFileId
        });
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_bank',
            value: batchData.bankId
        });
        const paymentMethodText = Object.values(PAYMENT_METHODS).find(method => method.value === batchData.paymentMethod).text;
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_payment_method',
            value: paymentMethodText
        });

        let date = new Date(batchData.paymentDate);
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_payment_date',
            value: date
        });
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_batch_no',
            value: batchReference
        });
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_reference_note',
            value: batchData.referenceNote
        });
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_total_transactions',
            value: batchData.totalTransactions
        });
        recordObj.setValue({
            fieldId: 'custrecord_ps_bpg_total_payment_amount',
            value: batchData.totalAmount
        });

        const recId = recordObj.save();
        log.debug('Record ID', recId);
        return recId;
    }

    function markTransactionsAsProcessed(transactionIds) {
       try {
            transactionIds.forEach(function(transactionId) {
                record.submitFields({
                    type: 'vendorpayment',
                    id: transactionId,
                    values: {
                        custbody_ps_ebp_file_generated: true
                    }
                });
            });
       } catch (e) {
           log.error('Error marking transactions as processed', e);
           throw e;
       }
    }

    function getWithHoldingTaxTransactions(transactionId) {
        const WHTransactions = [];
        var vendorcreditSearchObj = search.create({
            type: "vendorcredit",
            filters: [
                ["type","anyof","VendCred"], 
                "AND", 
                ["mainline","is","F"], 
                "AND", 
                ["custbody_wht_related_bill_pymnt","anyof", transactionId], 
                "AND", 
                ["taxline","is","F"], 
                "AND", 
                ["shipping","is","F"], 
                "AND", 
                ["cogs","is","F"] 
            ],
            columns: [
               search.createColumn({name: "tranid", label: "Document Number"}),
               search.createColumn({name: "amount", label: "Amount"}),
               search.createColumn({name: "item", label: "Item"}),
                search.createColumn({name: "rate", label: "Item Rate"}),
                search.createColumn({name: "custbody_ps_wht_condition", label: "PS|THT|Withholding Condition"})
            ]
         });
         
        const searchResults = getAllSavedSearchResults(vendorcreditSearchObj);
        const groupedResults = _.groupBy(searchResults, result => result.getValue({ name: "tranid" }));
        Object.keys(groupedResults).forEach(tranid => {
            const groupedTransactions = groupedResults[tranid];
            const items = groupedTransactions.map(item => ({
                item: item.getValue({ name: "item" }),
                amount: item.getValue({ name: "amount" }),
                rate: item.getValue({ name: "rate" })
            }));            
            WHTransactions.push({
                tranid: tranid,
                items: items,
                wht_condition: groupedTransactions[0].getText({ name: "custbody_ps_wht_condition" })
            })
        });

        return WHTransactions;
    }

    function getAllSavedSearchResults(searchObj){
        try {
            let set = 0;
            let mappingResult = [];
            const rs = searchObj.run();
            do {
                set = rs.getRange({
                    start: mappingResult.length,
                    end: mappingResult.length + 1000
                });
                mappingResult = mappingResult.concat(set);
            } while (set.length === 1000);
            return mappingResult;
        } catch (e) {
            log.error('Error getAllSavedSearchResults', e);
            throw e;
        }
    }

    function getCompanyDetails() {
        const companyDetailsRecord = record.load({
            type: 'customrecord_cseg_subs_branch',
            id: 1
        });
        const address1 = companyDetailsRecord.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr1'});
        const address2 = companyDetailsRecord.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr2'});
        const address3 = companyDetailsRecord.getValue({fieldId: 'custrecord_ps_wht_subs_branch_addr3'});

        const address = `${address1 ? address1 + '\n' : ''}${address2 ? address2 + '\n' : ''}${address3 ? address3 + '\n' : ''}`;
        const vatRegistrationNo = companyDetailsRecord.getValue({fieldId: 'custrecord_ps_wht_vat_reg_no'});
        return {
            mainaddress_text: address,
            custrecord_ps_wht_vat_registration_no: vatRegistrationNo
        };
    }

    return {
        execute: execute
    };
});