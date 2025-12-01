/**
 *@NApiVersion 2.0
 *@NScriptType ScheduledScript
 */
define(['N/log', 'N/search', 'N/record'], function (log, search, record) {

    function execute(context) {
        var title = 'execute[::]';
        try {
            var subOwnerShipData = subOwnerShipSearch();
            log.debug('subOwnerShipData', subOwnerShipData);

            // var subOwnerShipData = [{ "subOwenerShip": "1", "ownerShip": "85.0%", "NCIname": "AGP Shared Services", "subsidiary": "84", "startDate": "4/1/2025", "endDate": "", "debitAccount": "790", "creditAccount": "788", "currency": "", "parentSubsidiary": "62", "elimSubsidiary": "" }];

            var previousMonthDate = getPreviousMonthStartDate();
            log.debug('Previous Month Start Date', previousMonthDate);
            var accountPeriodObj = accountingPeriod(new Date(), previousMonthDate);
            log.debug('Accounting Period Object', accountPeriodObj);

            if (subOwnerShipData.length && subOwnerShipData.length > 0 && !isEmptyObject(accountPeriodObj)) {
                for (var m = 0; m < subOwnerShipData.length; m++) {
                    var data = subOwnerShipData[m];

                    var NCIName = data.NCIname + ' ' + accountPeriodObj.periodname;
                    var rawNetIncome = netIncomeSearch(data.subsidiary);

                    // Format Net Income for saving
                    var formattedNetIncome;
                    if (rawNetIncome > 0) {
                        // Positive → Loss → wrap in ()
                        formattedNetIncome = '(' + rawNetIncome.toFixed(2) + ')';
                    } else {
                        // Negative or zero → save as positive string
                        formattedNetIncome = Math.abs(rawNetIncome).toFixed(2);
                    }
                    log.debug('Formatted Net Income', formattedNetIncome);

                    var nciAmount = calculateNciAmount(data.ownerShip, Math.abs(rawNetIncome));

                    //NCI Calculation record exist or not
                    var NCICalcuationResult = nciCalculationSearchExist(NCIName);
                    if (NCICalcuationResult == 0) {

                        var nciRecObj = record.create({
                            type: 'customrecord_psg_ncicalculation'
                        });

                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_so', value: parseInt(data.subOwenerShip) });
                        nciRecObj.setValue({ fieldId: 'name', value: NCIName });
                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_so_sub', value: parseInt(data.subsidiary) });
                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_ccy', value: data.currency });
                        log.debug('Setting Currency', data.currency);

                        var ownership = data.ownerShip.toString().replace('%', '');
                        nciRecObj.setValue({
                            fieldId: 'custrecord_psg_nci_ownership',
                            value: parseFloat(ownership)
                        });
                        log.debug('OwnerShip Value', ownership);

                        // Save Net Income in formatted string
                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_ni', value: formattedNetIncome });
                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_amt', value: nciAmount });

                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_period', value: parseInt(accountPeriodObj.id) });
                        log.debug('Setting Posting Period', accountPeriodObj.id);


                        // Setting 2 Additional Fields on NCI
                        if (data.parentSubsidiary) {
                            nciRecObj.setValue({
                                fieldId: 'custrecord_psg_nci_parent',
                                value: parseInt(data.parentSubsidiary)
                            });
                            log.debug('Parent Subsidiary Set', data.parentSubsidiary);
                        }

                        if (data.elimSubsidiary) {
                            nciRecObj.setValue({
                                fieldId: 'custrecord_psg_nci_elimsub',
                                value: parseInt(data.elimSubsidiary)
                            });
                            log.debug('Elimination Subsidiary Set', data.elimSubsidiary);
                        }
                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_dracct', value: parseInt(data.debitAccount) });
                        nciRecObj.setValue({ fieldId: 'custrecord_psg_nci_cracct', value: parseInt(data.creditAccount) });

                        var nciRecId = nciRecObj.save();
                        log.debug({
                            title: 'NCI Calculation ID',
                            details: nciRecId
                        });
                    } else {
                        log.debug({
                            title: 'NCI Calculation Record Exist',
                            details: 'YES'
                        });
                    }
                }
            }
        } catch (e) {
            log.error(title + e.name, e.message);
        }
    }


    function subOwnerShipSearch() {
        var title = 'subOwnerShipSearch[::]';
        var obj;
        var array = [];
        try {
            var customrecord_psg_subownershipSearchObj = search.create({
                type: "customrecord_psg_subownership",
                // filters:
                //     [
                //         ["isinactive", "is", "F"],
                //         "AND",
                //         ["custrecord_psg_subown_startdate", "onorbefore", "today"]
                //     ],
                filters:
                    [
                        [["custrecord_psg_subown_enddate", "isempty", ""], "OR", ["custrecord_psg_subown_enddate", "notbefore", "startoflastmonth"]],
                        "AND",
                        ["custrecord_psg_subown_startdate", "onorbefore", "startoflastmonth"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "id", label: "SUBSIDIARY OWNERSHIP" }),
                        search.createColumn({ name: "custrecord_psg_subown_ownpercentage", label: "Ownership %" }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "SUBSTR({custrecord_psg_subown_sub}, INSTR({custrecord_psg_subown_sub}, ':', -1) + 1)",
                            label: "Subsidiary"
                        }),
                        search.createColumn({ name: "custrecord_psg_subown_sub", label: "Subsidiary" }),
                        search.createColumn({ name: "custrecord_psg_subown_startdate", label: "Start Date" }),
                        search.createColumn({ name: "custrecord_psg_subown_enddate", label: "End Date" }),
                        search.createColumn({ name: "custrecord_psg_subown_dracct", label: "NCI Debit Account" }),
                        search.createColumn({ name: "custrecord_psg_subown_cracct", label: "NCI Credit Account" }),
                        search.createColumn({ name: 'custrecord_psg_soccy', label: 'Currency' }),
                        search.createColumn({ name: "custrecord_psg_subown_parent", label: "Parent Subsidiary" }),
                        search.createColumn({ name: "custrecord_psg_subown_elimsub", label: "Elimination Subsidiary" })
                    ]
            });
            customrecord_psg_subownershipSearchObj.run().each(function (result) {
                obj = {};
                obj.subOwenerShip = result.getValue({ name: 'id' });
                obj.ownerShip = result.getValue({ name: 'custrecord_psg_subown_ownpercentage' });
                obj.NCIname = result.getValue({ name: 'formulatext' });
                obj.subsidiary = result.getValue({ name: 'custrecord_psg_subown_sub' });
                obj.startDate = result.getValue({ name: 'custrecord_psg_subown_startdate' });
                obj.endDate = result.getValue({ name: 'custrecord_psg_subown_enddate' });
                obj.debitAccount = result.getValue({ name: 'custrecord_psg_subown_dracct' });
                obj.creditAccount = result.getValue({ name: 'custrecord_psg_subown_cracct' });
                obj.currency = result.getValue({ name: 'custrecord_psg_soccy' });
                obj.parentSubsidiary = result.getValue({ name: 'custrecord_psg_subown_parent' });
                obj.elimSubsidiary = result.getValue({ name: 'custrecord_psg_subown_elimsub' });

                log.debug({
                    title: "SubOwnership Record",
                    details: {
                        "Internal ID": obj.subOwenerShip,
                        "Ownership %": obj.ownerShip,
                        "Subsidiary Name (Formula Text)": obj.NCIname,
                        "Subsidiary ID": obj.subsidiary,
                        "Start Date": obj.startDate,
                        "End Date": obj.endDate,
                        "Debit Account": obj.debitAccount,
                        "Credit Account": obj.creditAccount,
                        "Currency": obj.currency,
                        "Parent Subsidiary": obj.parentSubsidiary,
                        "Elimination Subsidiary": obj.elimSubsidiary
                    }
                });
                array.push(obj);
                return true;
            });
        } catch (e) {
            log.error(title + e.name, e.message);
        }
        return array || [];
    }

    function isEmptyObject(obj) {
        var title = 'isEmptyObject[::]';
        try {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    return false; // Object is not empty
                }
            }
            return true; // Object is empty
        } catch (e) {
            log.error(title + e.name, e.message);
        }
    }


    function getPreviousMonthStartDate() {
        var title = 'getPreviousMonthStartDate[::]';
        var formattedDate;
        try {
            // Get today's date
            var today = new Date();

            // Set the date to the 1st of the current month
            today.setDate(1);

            // Move the date to the previous month
            today.setMonth(today.getMonth() - 1);

            // Extract year, month, and day components
            var year = today.getFullYear();
            var month = today.getMonth() + 1; // getMonth() returns 0 for January, so we add 1
            var day = 1; // Start date of the previous month

            // Format the date as d/m/yyyy
            formattedDate = month + '/' + day + '/' + year;
        } catch (e) {
            log.error(title + e.name, e.message);
        }

        return formattedDate || '';
    }

    function accountingPeriod(thisMonthDate, previousMonthDate) {
        var title = 'accountingPeriod[::]';
        var obj;
        try {
            var accountingperiodSearchObj = search.create({
                type: "accountingperiod",
                // filters: [
                //     ["startdate", "on", previousMonthDate],
                //     // "AND",
                //     // ["enddate", "onorafter", previousMonthDate]
                // ],
                filters:
                    [
                        ["startdate", "onorafter", previousMonthDate],
                        "AND",
                        ["enddate", "onorbefore", "today"]
                    ],
                columns: [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "periodname", label: "Name" })
                ]
            });
            accountingperiodSearchObj.run().each(function (result) {
                obj = {};
                obj.id = result.id;
                obj.periodname = result.getValue({ name: 'periodname' });

                log.debug(title + 'Found Period', {
                    internalId: result.id,
                    periodName: obj.periodname,
                    idType: typeof result.id
                });

                return true;
            });

            log.debug(title + 'Final Object', obj);

        } catch (e) {
            log.error(title + e.name, e.message);
        }
        return obj || {};
    }

    function calculateNciAmount(percentageString, netIncome) {
        var title = 'calculateNciAmount[::]';
        try {
            // Remove the percentage sign using String.slice()
            var numberString = percentageString.slice(0, -1); // "87.3484"

            // Convert the string to a number
            var number = parseFloat(numberString); // 87.3484

            // Divide by 100 to convert percentage to decimal
            var decimalNumber = number / 100; // 0.873484

            // decimalNumber Output: 0.873484

            // calculate nciAmount
            // var nciAmount = ((1 - decimalNumber) * netIncome).toFixed(2);
            var nciAmount = parseFloat((1 - parseFloat(decimalNumber)) * netIncome);

        } catch (e) {
            log.error(title + e.name, e.message);
        }
        return parseFloat(nciAmount).toFixed(2) || 0;
    }

    function netIncomeSearch(sub) {
        var title = 'netIncomeSearch[::]';
        var obj;
        var netIncome = 0;
        try {
            var transactionSearchObj = search.load({
                id: "customsearch_psg_netincomesearch"
            });
            transactionSearchObj.filters.push(search.createFilter({
                name: 'subsidiary',
                operator: search.Operator.ANYOF,
                values: [sub]
            }));
            transactionSearchObj.filters.push(search.createFilter({
                name: 'postingperiod',
                operator: search.Operator.IS,
                values: "LP"
            }));
            transactionSearchObj.run().each(function (result) {
                // netIncome += parseFloat(result.getValue({ name: "amount", summary: "SUM" })) || 0;
                netIncome += parseFloat(result.getValue({ name: "formulacurrency", summary: "SUM", formula: "case when {accounttype} = 'Income' then -{amount} when {accounttype} = 'Other Income' then -{amount} else {amount} end" })) || 0;
                // obj = {};
                // obj.netIncome = result.getValue({ name: "amount", summary: "SUM" });
                // obj.endDate = result.getValue({ name: "enddate", join: "accountingPeriod", summary: "GROUP" });
                return true;
            });
        } catch (e) {
            log.error(title + e.name, e.message);
        }
        return netIncome;
    }

    function nciCalculationSearchExist(NCIName) {
        var title = 'nciCalculationSearchExist[::]';
        var recId;
        try {
            var customrecord_psg_ncicalculationSearchObj = search.create({
                type: "customrecord_psg_ncicalculation",
                filters:
                    [
                        ["name", "is", NCIName]
                    ]
            });
            customrecord_psg_ncicalculationSearchObj.run().each(function (result) {
                recId = result.id;
                return false;
            });

        } catch (e) {
            log.error(title + e.name, e.message);
        }
        return recId || 0;
    }

    return {
        execute: execute
    }
});