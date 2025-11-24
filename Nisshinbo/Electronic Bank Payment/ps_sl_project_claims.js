/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/redirect', 'N/runtime', 'N/email','N/url', './moment.js','N/file', 'N/task'],
    function(serverWidget, search, record, redirect, runtime, email,url, moment,file, task) {
        let currentClaimDate = null;

        function getAccountUrl() {
            var domain = url.resolveDomain({
                hostType: url.HostType.APPLICATION
            });
            
            var accountUrl = 'https://' + domain;
            log.debug('Account URL', accountUrl);
            return accountUrl;
        }

        function mergeAddress(arr)
        {
            var returnAddress = '';

            if(arr.length>0)
            {
                for(var a=0;a<arr.length;a++)
                {
                    if(arr[a] && arr[a]!='')
                    {
                        if(returnAddress && returnAddress!='')
                        {
                            returnAddress = returnAddress + ' ' ;
                        }

                        returnAddress = returnAddress + arr[a];
                    }
                }
            }
            log.debug('returnaddress',returnAddress);

            return returnAddress;
            
        }

        function getRecordName(id,recordName,fieldName)
        {
            var returnName = '';

            var myFieldsSearch = search.lookupFields({ 
                type: recordName, 
                id: id, 
                columns: [fieldName] 
            });

            log.debug('myFieldsSearch',myFieldsSearch);
            //returnName =  myFieldsSearch.name;

            return myFieldsSearch;
        }

        function sendEmailForProjectClaims(claimType,jsonDataArray)
        {
            var emailBody = 'Dear User<br/><br/> ';

            if(claimType=='edit')
            {
                emailBody += 'There is a claim Updated.';
            }
            else
            {
                emailBody += 'There is new claim Submitted.';
            }

            emailBody += 'Please find details below.<br/><br/>';   
            
            if(jsonDataArray.length>0)
            {

                if(jsonDataArray[0].claimId)
                {
                    emailBody += 'Claim Id: ' + jsonDataArray.claimId + '<br/>';    
                }

                var recordLink = url.resolveRecord({
                    recordType: 'customrecord_ps_boq_project_claims',
                    recordId: jsonDataArray[0].dataId,
                    isEditMode: false
                });

                var recordLink = url.resolveScript({
                    scriptId: 'customscript_ps_sl_project_claims',
                    deploymentId: 'customdeploy_ps_sl_project_claims',
                    returnExternalUrl: false,
                    params:{"projectid":jsonDataArray[0].project,"progressiveClaimNumber":jsonDataArray[0].claimProgressiveNo}
                });
                
                
                emailBody += 'Claim Progressive No: <a href=" ' + recordLink +  ' ">' + jsonDataArray[0].claimProgressiveNo + '</a><br/>';
                emailBody += 'Claim Date: ' + jsonDataArray[0].claimDate + '<br/>';   

                var companyName = getRecordName(jsonDataArray[0].customer,'customer','companyname');
                emailBody += 'Customer: ' + companyName.companyname + '<br/>';

                var projectName = getRecordName(jsonDataArray[0].project,'job','companyname');
                emailBody += 'Project: ' + projectName.companyname + '<br/><br/><br/>Details:<br/><br/>';                

                var toAddress = runtime.getCurrentUser().email;
                if (!toAddress) {
                    toAddress = 'aayushi@point-star.com';
                }
                log.debug('toAddress',toAddress);

                var subject='Project Claim Submitted';


                for(var j=0;j<jsonDataArray.length;j++)
                {
                    var jsonData = jsonDataArray[j];

                    log.debug('jsonData',jsonData);

                    emailBody += 'Claim Quantity: ' + jsonData.currentClaimQuantity + '<br/>';
                    emailBody += 'Current Claim Amount: ' + jsonData.currentClaimAmount + '<br/>';
                    emailBody += 'Current Claim Percentage: ' + jsonData.currentClaimPercentage || 0 ;
                    emailBody += '<br/>Certified Claim Amount: ' + jsonData.certifiedClaimAmount + '<br/>';

                    if(jsonData.claimPercentage)
                    {
                        emailBody += 'Certified Claim Percentage: ' + jsonData.claimPercentage + '<br/>';            
                    }
                    
                    emailBody += '<br/><br/>';                   

                }
                email.send({
                    author: -5,
                    recipients: toAddress,
                    subject: subject,
                    body: emailBody
                });
            
                log.audit('Send email function ', 'Triggered');
            }
        }

        function removeAttn(addressText)
        {
            var addr = '';

            if(addressText)
            {
                if(addressText.length>0)
                    {
                        var addrArray = addressText.split(',');
                        log.emergency('addrArray',addrArray);
        
                        if(addrArray.length>1)
                        {
                            for(var a=1;a<addrArray.length;a++)
                            {
                                if(addr.length>0)
                                {
                                    addr = addr  + ', ';
                                }
        
                                addr = addr + addrArray[a];
                            }
                        }
                    }
            }
            

            

            return addr;
        }

        function numberWithCommas(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        function concatAddress(addressArray) {
            var returnAddress = '';

            if (addressArray.length > 0) {
                for (a = 0; a < addressArray.length; a++) {
                    if (addressArray[a] != '') {
                        if (returnAddress != '') {
                            returnAddress = returnAddress + ', ';
                        }
                        returnAddress = returnAddress + addressArray[a];
                    }

                }
            }

            return returnAddress;
        }

        function dateDMY(dateMDY) {

            var dateArray = dateMDY.split('/');
            var dateDMY = new Date(dateArray[2], (dateArray[1] - 1), dateArray[0], 0, 0, 0, 0);
            return dateDMY;
        }

        function onRequest(context) {

            var form = serverWidget.createForm({
                title: 'Project Claims'
            });

            if (context.request.method == 'POST') 
                {
                var claimPDF = context.request.parameters.custpage_pdf;

                if (claimPDF == 'F') 
                {

                    //submit claim
                    var projectId = parseInt(context.request.parameters.custpage_project, 10);
                    var customerId = context.request.parameters.custpage_customer;
                    var projectId = context.request.parameters.custpage_project;
                    var claimDate = context.request.parameters.custpage_claimdate;
                    var claimProgressiveNo = context.request.parameters.custpage_progressiveclaimno;
                    if(claimProgressiveNo == 'create_new'){
                        claimProgressiveNo = context.request.parameters.custpage_new_claim_number;
                    }
                    var lineCount = context.request.getLineCount({
                        group: 'sublist_orders'
                    });
                    const variationLineCount = context.request.getLineCount({
                        group: 'sublist_orders1'
                    });
                    const linesToSave = [];
                    var jsonData = [];
                    for (var i = 0; i < lineCount; i++) 
                    {

                        var selectedOrderLine = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'orders_check',
                            line: i
                        });
                        if (selectedOrderLine == 'T') {
                            var selectedClaimId = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'claim_id',
                                line: i
                            }) || null;
                            var selectedItemDesc = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'desc',
                                line: i
                            });
                            var selectedClaimableAmount = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'claimable_amount',
                                line: i
                            });
                            var selectedCurrentClaimAmount = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'this_month_amount',
                                line: i
                            });
                            var selectedCertifiedClaimAmount = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'certified_claim',
                                line: i
                            });
                            var claimRemarks = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'remarks',
                                line: i
                            });
                            var selectedIsVariationLine = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'is_variation_line',
                                line: i
                            });
                            var currentClaimQuantity = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'quantity_editable',
                                line: i
                            });
                            var currentClaimPercentage = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'perc_editable',
                                line: i
                            });
                            var salesOrder = context.request.getSublistValue({
                                group: 'sublist_orders',
                                name: 'boq_sales_order',
                                line: i
                            });

                            var claimType = 'edit';
                            var certifiedClaimPercentage = ((parseFloat(selectedCertifiedClaimAmount) / parseFloat(selectedClaimableAmount)) * 100).toFixed(2);                           

                            if (selectedClaimId != null ) 
                            {
                                var objCR = record.load({
                                    type: 'customrecord_ps_boq_project_claims',
                                    id: selectedClaimId,
                                    isDynamic: true
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_amount',
                                    value: selectedCurrentClaimAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_certifiedamount',
                                    value: selectedCertifiedClaimAmount
                                });
                                
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_certifiedclaimp',
                                    value: certifiedClaimPercentage
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_claimno',
                                    value: parseInt(claimProgressiveNo)
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_claim_remarks',
                                    value: claimRemarks
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_quantity',
                                    value:  currentClaimQuantity
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_perc',
                                    value: currentClaimPercentage
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_date',
                                    value: dateDMY(claimDate)
                                });
                                
                                var dataId = objCR.save();
                                if(selectedCertifiedClaimAmount && selectedCertifiedClaimAmount>0)
                                {
                                    jsonData.push({'claimId':selectedClaimId,'customer':customerId,'project':projectId,'itemDescription':selectedItemDesc, 'currentClaimAmount':selectedCurrentClaimAmount,'certifiedClaimAmount':selectedCertifiedClaimAmount,'claimPercentage':certifiedClaimPercentage,'claimProgressiveNo':claimProgressiveNo,'claimRemarks':claimRemarks,'currentClaimQuantity':currentClaimQuantity,'currentClaimPercentage':currentClaimPercentage,'claimDate':claimDate,'dataId':dataId});
                                }
                            } else {

                                claimType = 'create';
                                var objCR = record.create({
                                    type: 'customrecord_ps_boq_project_claims',
                                    isDynamic: true
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_customer',
                                    value: customerId
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_date',
                                    value: dateDMY(claimDate)
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_project',
                                    value: projectId
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_amount',
                                    value: selectedCurrentClaimAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_certifiedamount',
                                    value: selectedCertifiedClaimAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_description',
                                    value: selectedItemDesc
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claimable_amount',
                                    value: selectedClaimableAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_claimno',
                                    value: parseInt(claimProgressiveNo)
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_claim_remarks',
                                    value: claimRemarks
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_quantity',
                                    value:  currentClaimQuantity
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_perc',
                                    value: currentClaimPercentage
                                });
                                var variation = false;
                                if (selectedIsVariationLine == 'T') {
                                    variation = true;
                                }
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_variation',
                                    value: variation
                                });
                                
                                var crId = objCR.save();

                                if(selectedCertifiedClaimAmount && selectedCertifiedClaimAmount>0)
                                {
                                    jsonData.push({'claimId':selectedClaimId,'customer':customerId,'project':projectId,'itemDescription':selectedItemDesc, 'currentClaimAmount':selectedCurrentClaimAmount,'certifiedClaimAmount':selectedCertifiedClaimAmount,'claimProgressiveNo':claimProgressiveNo,'claimRemarks':claimRemarks,'currentClaimQuantity':currentClaimQuantity,'currentClaimPercentage':currentClaimPercentage,'claimDate':claimDate,'dataId':crId});
                                }
                            }

                           if(selectedCertifiedClaimAmount > 0 && salesOrder )
                            {
                                linesToSave.push({
                                    claimId: selectedClaimId,
                                    salesOrder: salesOrder,
                                    certifiedClaimPercentage: certifiedClaimPercentage,
                                    itemDescription: selectedItemDesc,
                                    isVariationLine: selectedIsVariationLine
                                });
                            }
                            
                        }
                    }

                     //send email about the claim only if certified claim is there
                     if(jsonData.length>0)
                     {
                        sendEmailForProjectClaims(claimType,jsonData);
                     }

                    // Create | Update Variation Order Claims
                    for (var i = 0; i < variationLineCount; i++) {
                        const selectedVariationOrderLine = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'orders_check1',
                            line: i
                        });
                        if(selectedVariationOrderLine == 'T') {
                            const selectedClaimId = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'claim_id1',
                                line: i
                            }) || null;
                            const selectedItemDesc = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'desc1',
                                line: i
                            });
                            const selectedClaimableAmount = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'claimable_amount1',
                                line: i
                            });
                            const selectedCurrentClaimAmount = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'this_month_amount1',
                                line: i
                            });
                            const selectedCertifiedClaimAmount = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'certified_claim1',
                                line: i
                            });
                            const claimRemarks = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'remarks1',
                                line: i
                            });
                            const selectedIsVariationLine = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'is_variation_line1',
                                line: i
                            });
                            const currentClaimQuantity = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'quantity_editable1',
                                line: i
                            });
                            const currentClaimPercentage = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'perc_editable1',
                                line: i
                            });

                            const salesOrder = context.request.getSublistValue({
                                group: 'sublist_orders1',
                                name: 'boq_sales_order1',
                                line: i
                            });

                            if (selectedClaimId != null ) {
                                const objCR = record.load({
                                    type: 'customrecord_ps_boq_project_claims',
                                    id: selectedClaimId,
                                    isDynamic: true
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_amount',
                                    value: selectedCurrentClaimAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_certifiedamount',
                                    value: selectedCertifiedClaimAmount
                                });
                                const claimPercentage = ((parseFloat(selectedCertifiedClaimAmount) / parseFloat(selectedClaimableAmount)) * 100).toFixed(2);
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_certifiedclaimp',
                                    value: claimPercentage
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_claimno',
                                    value: parseInt(claimProgressiveNo)
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_claim_remarks',
                                    value: claimRemarks
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_quantity',
                                    value:  currentClaimQuantity
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_perc',
                                    value: currentClaimPercentage
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_date',
                                    value: dateDMY(claimDate)
                                });
                                objCR.save();
                            } else {
                                const objCR = record.create({
                                    type: 'customrecord_ps_boq_project_claims',
                                    isDynamic: true
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_customer',
                                    value: customerId
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_date',
                                    value: dateDMY(claimDate)
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_project',
                                    value: projectId
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_amount',
                                    value: selectedCurrentClaimAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_certifiedamount',
                                    value: selectedCertifiedClaimAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_description',
                                    value: selectedItemDesc
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claimable_amount',
                                    value: selectedClaimableAmount
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_claimno',
                                    value: parseInt(claimProgressiveNo)
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_claim_remarks',
                                    value: claimRemarks
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_quantity',
                                    value:  currentClaimQuantity
                                });
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_perc',
                                    value: currentClaimPercentage
                                });
                                let variation = false;
                                if (selectedIsVariationLine == 'T') {
                                    variation = true;
                                }
                                objCR.setValue({
                                    fieldId: 'custrecord_ps_boq_claims_variation',
                                    value: variation
                                });
                                const crId = objCR.save();
                            }

                            if (selectedCertifiedClaimAmount > 0 && salesOrder) {
                                linesToSave.push({
                                    claimId: selectedClaimId,
                                    salesOrder: salesOrder,
                                    certifiedClaimPercentage: certifiedClaimPercentage,
                                    itemDescription: selectedItemDesc,
                                    isVariationLine: selectedIsVariationLine
                                });
                            }
                        }
                    }

                    log.debug("Lines to Save", JSON.stringify(linesToSave));

                   // Process Fulfillments
                   if (linesToSave.length > 0) {
                        // Group lines by sales order
                        var orderItemsObjectMap = {};
                        linesToSave.forEach(function(line, index) {
                            var salesOrderId = line.salesOrder;
                            var claimId = line.claimId;
                            var certifiedClaimPercentage = parseFloat(line.certifiedClaimPercentage) || 0;
                            var certifiedClaimAmount = parseFloat(line.certifiedClaimAmount) || 0;
                            var itemDescription = line.itemDescription;
                            var isVariationLine = line.isVariationLine === 'T';

                            if (!salesOrderId || certifiedClaimPercentage <= 0 || certifiedClaimAmount <= 0) {
                                log.debug({
                                    title: 'Skipping Line ' + (index + 1),
                                    details: 'Sales Order: ' + salesOrderId + ', Claim ID: ' + claimId +
                                            ', Certified Claim %: ' + certifiedClaimPercentage +
                                            ', Certified Claim Amount: ' + certifiedClaimAmount
                                });
                                return;
                            }

                            if (!orderItemsObjectMap[salesOrderId]) {
                                orderItemsObjectMap[salesOrderId] = [];
                            }
                            orderItemsObjectMap[salesOrderId].push({
                                claimId: claimId,
                                itemDescription: itemDescription,
                                certifiedClaimPercentage: certifiedClaimPercentage,
                                certifiedClaimAmount: certifiedClaimAmount,
                                isVariationLine: isVariationLine
                            });
                        });

                        log.debug('Order Items Object Map', JSON.stringify(orderItemsObjectMap));

                        // Process each sales order
                        for (var salesOrderId in orderItemsObjectMap) {
                            var items = orderItemsObjectMap[salesOrderId];
                            var allClaimIds = items.map(item => item.claimId).filter(claimId => claimId !== null);

                            try {
                                // Check for existing fulfillments linked to claims
                                var existingFulfillmentIds = [];
                                allClaimIds.forEach(claimId => {
                                    var claimFields = search.lookupFields({
                                        type: 'customrecord_ps_boq_project_claims',
                                        id: claimId,
                                        columns: ['custrecord_ps_boq_claims_fulfillment_id']
                                    });
                                    var fulfillmentId = claimFields.custrecord_ps_boq_claims_fulfillment_id[0]?.value;
                                    if (fulfillmentId && existingFulfillmentIds.indexOf(fulfillmentId) === -1) {
                                        existingFulfillmentIds.push(fulfillmentId);
                                    }
                                });

                                var fulfillment;
                                if (existingFulfillmentIds.length > 0) {
                                    // Update existing fulfillment
                                    fulfillment = record.load({
                                        type: record.Type.ITEM_FULFILLMENT,
                                        id: existingFulfillmentIds[0],
                                        isDynamic: true
                                    });
                                    log.debug({
                                        title: 'Loaded Existing Fulfillment',
                                        details: 'Fulfillment ID: ' + existingFulfillmentIds[0] + ' for Sales Order: ' + salesOrderId
                                    });
                                } else {
                                    // Create new fulfillment
                                    fulfillment = record.transform({
                                        fromType: record.Type.SALES_ORDER,
                                        fromId: salesOrderId,
                                        toType: record.Type.ITEM_FULFILLMENT,
                                        isDynamic: true
                                    });
                                    fulfillment.setValue({
                                        fieldId: 'shipstatus',
                                        value: 'C' // Shipped
                                    });
                                    log.debug({
                                        title: 'Created New Fulfillment',
                                        details: 'For Sales Order: ' + salesOrderId
                                    });
                                }

                                // Calculate prorated quantities and rates
                                var lineCount = fulfillment.getLineCount({ sublistId: 'item' });
                                items.forEach(item => {
                                    let totalItemQtyInFulfillment = 0;
                                    let totalLineQty = 0;
                                    // First pass: Calculate prorated quantities
                                    for (let i = 0; i < lineCount; i++) {
                                        var lineDescription = fulfillment.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'description',
                                            line: i
                                        });
                                        if (lineDescription === item.itemDescription) {
                                            var lineQty = parseFloat(fulfillment.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                line: i
                                            })) || 0;
                                            var proratedQty = lineQty * (parseFloat(item.certifiedClaimPercentage) / 100);
                                            totalItemQtyInFulfillment += proratedQty;
                                            totalLineQty += lineQty;

                                            fulfillment.selectLine({ sublistId: 'item', line: i });
                                            fulfillment.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                value: parseFloat(proratedQty.toFixed(2))
                                            });
                                            fulfillment.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'itemreceive',
                                                value: true
                                            });
                                            fulfillment.commitLine({ sublistId: 'item' });
                                        }
                                    }
                                    // Calculate line rate
                                    item.lineQty = totalLineQty;
                                    item.totalItemQtyInFulfillment = totalItemQtyInFulfillment;
                                    item.lineRate = totalItemQtyInFulfillment > 0 ? item.certifiedClaimAmount / totalItemQtyInFulfillment : 0;
                                });

                                // Second pass: Update amounts in custom field
                                items.forEach(item => {
                                    for (let i = 0; i < lineCount; i++) {
                                        var lineDescription = fulfillment.getSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'description',
                                            line: i
                                        });
                                        if (lineDescription === item.itemDescription) {
                                            fulfillment.selectLine({ sublistId: 'item', line: i });
                                            var lineQty = parseFloat(fulfillment.getSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                line: i
                                            })) || 0;
                                            var lineAmount = parseFloat((item.lineRate * lineQty).toFixed(2));
                                            fulfillment.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_ps_claim_certified_amount',
                                                value: lineAmount
                                            });
                                            fulfillment.commitLine({ sublistId: 'item' });

                                            log.debug({
                                                title: 'Updated Fulfillment Line',
                                                details: 'Sales Order: ' + salesOrderId + ', Line: ' + i +
                                                        ', Description: ' + item.itemDescription +
                                                        ', Prorated Qty: ' + lineQty +
                                                        ', Line Rate: ' + item.lineRate +
                                                        ', Certified Amount: ' + lineAmount
                                            });
                                        }
                                    }
                                });


                                // Save fulfillment
                                if (items.length > 0) {
                                    var fulfillmentId = fulfillment.save({
                                        enableSourcing: true,
                                        ignoreMandatoryFields: true
                                    });

                                    log.audit({
                                        title: (existingFulfillmentIds.length > 0 ? 'Fulfillment Updated' : 'Fulfillment Created'),
                                        details: 'Fulfillment ID: ' + fulfillmentId + ' for Sales Order: ' + salesOrderId
                                    });

                                    // Link fulfillment to claim records
                                    allClaimIds.forEach(claimId => {
                                        record.submitFields({
                                            type: 'customrecord_ps_boq_project_claims',
                                            id: claimId,
                                            values: {
                                                custrecord_ps_boq_claims_fulfillment_id: fulfillmentId
                                            }
                                        });
                                        log.debug({
                                            title: 'Claim Updated',
                                            details: 'Claim ID: ' + claimId + ' linked to Fulfillment ID: ' + fulfillmentId
                                        });
                                    });
                                }
                            } catch (e) {
                                log.error({
                                    title: 'Error Processing Sales Order ' + salesOrderId,
                                    details: e.message
                                });
                            }
                        }
                    }
                    var success_msg = form.addField({
                        id: 'user_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Data Submitted Successfully'
                    });
                    success_msg.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });
                } else 
                {
                    //print pdf
                    var projectId = parseInt(context.request.parameters.custpage_project, 10);
                    var customeraddress = context.request.parameters.custpage_customer_address1;
                    var customerattn = context.request.parameters.custpage_customer_attn1; 
                    var customerId = context.request.parameters.custpage_customer;
                    var projectId = context.request.parameters.custpage_project;
                    var claimDate = context.request.parameters.custpage_claimdate;
                    var claimProgressiveNo = context.request.parameters.custpage_progressiveclaimno;

                    if(claimProgressiveNo=='create_new')
                    {
                        claimProgressiveNo='-';
                    }
                    var claimLabel = context.request.parameters.custpage_label;
                    var claimRevNo = context.request.parameters.custpage_revision_no;

                    
                    //customer data
                    var objCustomer = record.load({type:'customer',id:customerId});
                    var customerName = customerId;
                    var isPerson = objCustomer.getValue({fieldId:'isperson'});
                    if(isPerson=='F')
                    {
                        customerName = objCustomer.getValue({fieldId:'companyname'});
                    }
                    else
                    {
                        customerName = objCustomer.getValue({fieldId:'firstname'}) + ' ' + objCustomer.getValue({fieldId:'lastname'});
                    }
                    

                    //total data
                    var totalqty = context.request.parameters.custpage_total_qty || 0;
                    var totalamountfooter = context.request.parameters.custpage_total_amount || 0;
                    var totalpercentagefooter = 0;
                    var totalthismonthpercentagefooter = 0;
                    var cumpercentagefooter = 0;
                    var cumamountfooter = 0;
                    var lbdcertificatefooter = 0;
                    var differencefooter = 0;

                    var totalamountfooter1 = context.request.parameters.custpage_total_amount1 || 0;
                    var totalpercentagefooter1 = 0;
                    var totalthismonthpercentagefooter1 = 0;
                    var cumpercentagefooter1 = 0;
                    var cumamountfooter1 = 0;
                    var lbdcertificatefooter1 = 0;
                    var differencefooter1 = 0;

                    var totalprevamount1 = context.request.parameters.custpage_total_prev_amount1 || 0;
                    var totalthismonthamount1 = context.request.parameters.custpage_total_thismonth_amount1 || 0;


                    var totalprevqty = context.request.parameters.custpage_total_prev_qty || 0;
                    var totalprevamount = context.request.parameters.custpage_total_prev_amount || 0;
                    var totalthismonthqty = context.request.parameters.custpage_total_thismonth_qty || 0;
                    var totalthismonthamount = context.request.parameters.custpage_total_thismonth_amount || 0;

                    var amountofthispaymentclaim = context.request.parameters.custpage_total_thismonth_amount2 || 0;
                    var amountofthispaymentclaimgst = amountofthispaymentclaim*9/100;
                    var amountofthispaymentclaimfinal = parseFloat(amountofthispaymentclaim) + parseFloat(amountofthispaymentclaimgst);
                    

                    var lineCount = context.request.getLineCount({
                        group: 'sublist_orders'
                    });
                    var lineCount1 = context.request.getLineCount({
                        group: 'sublist_orders1'
                    });
                    var orderArray = [];
                    var variationOrderArray = [];

                    for (var i = 0; i < lineCount; i++) {

                        var itemCount = parseInt(i) + 1;

                        var desc = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'desc',
                            line: i
                        });
                        var unit = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'unit',
                            line: i
                        });
                        var qty = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'custpage_boq_quantity',
                            line: i
                        });
                        var rate = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'rate',
                            line: i
                        });
                        var totalamount = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'claimable_amount',
                            line: i
                        });
                        var prevqty = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'prev_claim_qty',
                            line: i
                        });
                        var prevperc = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'prev_claim_percentage',
                            line: i
                        });
                        totalpercentagefooter = parseFloat(totalpercentagefooter) + parseFloat(prevperc);

                        var prevamount = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'prev_claim',
                            line: i
                        });
                        var thismonthqty = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'quantity_editable',
                            line: i
                        });
                        var thismonthperc = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'perc_editable',
                            line: i
                        });
                        totalthismonthpercentagefooter = parseFloat(totalthismonthpercentagefooter) + parseFloat(thismonthperc);

                        var thismonthamount = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'this_month_amount',
                            line: i
                        });
                        var cumqty = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'cumulative_qty',
                            line: i
                        });
                        var cumperc = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'cumulative_perc',
                            line: i
                        });
                        cumpercentagefooter = parseFloat(cumpercentagefooter) + parseFloat(cumperc);

                        var cumamount = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'cumulative_total',
                            line: i
                        });
                        cumamountfooter = parseFloat(cumamountfooter) + parseFloat(cumamount);

                        var totalclaimamount = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'total_claim_amount',
                            line: i
                        });
                        var lbdcertificate = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'certified_claim',
                            line: i
                        });
                        lbdcertificatefooter = parseFloat(lbdcertificatefooter) + parseFloat(lbdcertificate);

                        var difference = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'difference',
                            line: i
                        }) || 0;
                        differencefooter = parseFloat(differencefooter) + parseFloat(difference);

                        var remarks = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'remarks',
                            line: i
                        });
                        var customercertification = context.request.getSublistValue({
                            group: 'sublist_orders',
                            name: 'lbd_certification',
                            line: i
                        }) || 0;
                       
                        

                        qty = parseFloat(qty).toFixed(2);
                        rate = parseFloat(rate).toFixed(2);
                        totalamount = parseFloat(totalamount).toFixed(2);
                        prevqty = parseFloat(prevqty).toFixed(2);
                        prevamount = parseFloat(prevamount).toFixed(2);
                        thismonthqty = parseFloat(thismonthqty).toFixed(2);
                        thismonthamount = parseFloat(thismonthamount).toFixed(2);
                        cumamount = parseFloat(cumamount).toFixed(2);
                        totalclaimamount = parseFloat(totalclaimamount).toFixed(2);
                        cumqty = parseFloat(cumqty).toFixed(2);
                        customercertification = parseFloat(customercertification).toFixed(2);
                        difference = parseFloat(difference).toFixed(2);

                        orderArray.push({
                            'description': desc.replace(/&/g, "&amp;"),
                            'unit': unit,
                            'qty': numberWithCommas(qty),
                            'rate': numberWithCommas(rate),
                            'totalamount': numberWithCommas(totalamount),
                            'prevqty': numberWithCommas(prevqty),
                            'prevperc': prevperc,
                            'prevamount': numberWithCommas(prevamount),
                            'thismonthqty': numberWithCommas(thismonthqty),
                            'thismonthperc': thismonthperc,
                            'thismonthamount': numberWithCommas(thismonthamount),
                            'cumqty': numberWithCommas(cumqty),
                            'cumperc': cumperc,
                            'cumamount': numberWithCommas(cumamount),
                            'totalclaimamount': numberWithCommas(totalclaimamount),
                            'lbdcertificate': lbdcertificate,
                            'difference': difference,
                            'remarks': remarks,
                            'itemcount':itemCount,
                            'customercertification':customercertification
                        });

                    }

                    for (var i = 0; i < lineCount1; i++) {

                        var itemCount = parseInt(i)+1;

                        var desc = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'desc1',
                            line: i
                        });
                        var unit = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'unit1',
                            line: i
                        });
                        var qty = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'boq_quantity1',
                            line: i
                        });
                        var rate = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'rate1',
                            line: i
                        });
                        var totalamount = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'claimable_amount1',
                            line: i
                        });
                        var prevqty = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'prev_claim_qty1',
                            line: i
                        });
                        var prevperc = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'prev_claim_percentage1',
                            line: i
                        });
                        totalpercentagefooter1 = parseFloat(totalpercentagefooter1) + parseFloat(prevperc);

                        var prevamount = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'prev_claim1',
                            line: i
                        });
                        var thismonthqty = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'quantity_editable1',
                            line: i
                        });
                        var thismonthperc = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'perc_editable1',
                            line: i
                        });
                        totalthismonthpercentagefooter1 = parseFloat(totalthismonthpercentagefooter1) + parseFloat(thismonthperc);

                        var thismonthamount = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'this_month_amount1',
                            line: i
                        });
                        var cumqty = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'cumulative_qty1',
                            line: i
                        });
                        var cumperc = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'cumulative_perc1',
                            line: i
                        });
                        cumpercentagefooter1 = parseFloat(cumpercentagefooter1) + parseFloat(cumperc);

                        var cumamount = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'cumulative_total1',
                            line: i
                        });
                        cumamountfooter1 = parseFloat(cumamountfooter1) + parseFloat(cumamount);

                        var totalclaimamount = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'total_claim_amount1',
                            line: i
                        });
                        var lbdcertificate = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'certified_claim1',
                            line: i
                        });
                        
                        
                        var difference = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'difference1',
                            line: i
                        });
                        differencefooter1 = parseFloat(differencefooter1) + parseFloat(difference);

                        var remarks = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'remarks1',
                            line: i
                        });
                        var customercertification = context.request.getSublistValue({
                            group: 'sublist_orders1',
                            name: 'lbd_certification1',
                            line: i
                        }) || 0;
                        lbdcertificatefooter1 = parseFloat(lbdcertificatefooter1) + parseFloat(customercertification);

                        qty = parseFloat(qty).toFixed(2);
                        rate = parseFloat(rate).toFixed(2);
                        totalamount = parseFloat(totalamount).toFixed(2);
                        prevqty = parseFloat(prevqty).toFixed(2);
                        prevamount = parseFloat(prevamount).toFixed(2);
                        thismonthqty = parseFloat(thismonthqty).toFixed(2);
                        thismonthamount = parseFloat(thismonthamount).toFixed(2);
                        cumamount = parseFloat(cumamount).toFixed(2);
                        totalclaimamount = parseFloat(totalclaimamount).toFixed(2);
                        cumqty = parseFloat(cumqty).toFixed(2);
                        customercertification = parseFloat(customercertification).toFixed(2);
                        difference = parseFloat(difference).toFixed(2);

                        variationOrderArray.push({
                            'description': desc.replace(/&/g, "&amp;"),
                            'unit': unit,
                            'qty': numberWithCommas(qty),
                            'rate': numberWithCommas(rate),
                            'totalamount': numberWithCommas(totalamount),
                            'prevqty': numberWithCommas(prevqty),
                            'prevperc': prevperc,
                            'prevamount': numberWithCommas(prevamount),
                            'thismonthqty': numberWithCommas(thismonthqty),
                            'thismonthperc': thismonthperc,
                            'thismonthamount': numberWithCommas(thismonthamount),
                            'cumqty': numberWithCommas(cumqty),
                            'cumperc': cumperc,
                            'cumamount': numberWithCommas(cumamount),
                            'totalclaimamount': numberWithCommas(totalclaimamount),
                            'lbdcertificate': lbdcertificate,
                            'difference': difference,
                            'remarks': remarks,
                            'itemcount':itemCount,
                            'customercertification': customercertification
                        });

                        log.emergency('variationorderarray',variationOrderArray);
                    
                    }


                    var objProject = record.load({
                        type: 'job',
                        id: projectId
                    });
                    var projectName = objProject.getValue({
                        fieldId: 'entityid'
                    });
                    var projectSubsidiaryId = objProject.getValue({
                        fieldId: 'subsidiary'
                    });
                    log.debug('projectSubsidiaryId',projectSubsidiaryId);

                    //get subsidiary logo
                    var subsidiaryLogo = '';
                    var subsidiaryName = '';
                    var subsidiaryAddress = '';
                    var subsidiaryPhone = '';
                    var subsidiaryGST = '';

                    if(projectSubsidiaryId)
                    {
                        var objSubsidiary = record.load({type:'subsidiary',id:projectSubsidiaryId});
                        var subsidiaryLogoId = objSubsidiary.getValue({fieldId:'logo'});
                        log.debug('subsidiarylogoid',subsidiaryLogoId);
                        var objFile = file.load({id:subsidiaryLogoId});
                        log.debug('objfile',objFile);

                        var accountId = runtime.accountId;
                        var logoURL = getAccountUrl() + objFile.url;
                        logoURL = logoURL.replace(/&/g, "&amp;"),
                        log.debug('logourl2',logoURL);


                        subsidiaryLogo = logoURL;
                       // subsidiaryLogo = 'https://9542059-sb1.app.netsuite.com/core/media/media.nl?id=2215&amp;c=9542059_SB1&amp;h=SDLPhwGTKkmJl-064ZqeMIV-XmHXyBijPrfjkPbHbdoKRcmq';
                        subsidiaryName = objSubsidiary.getValue({fieldId:'name'});
                        
                        var subsidiarySubRecord = objSubsidiary.getSubrecord({                                    
                            fieldId: 'mainaddress'                                    
                        });
                        var subAddress1 = subsidiarySubRecord.getValue({ "fieldId": "addr1"});
                        var subAddress2 = subsidiarySubRecord.getValue({ "fieldId": "addr2"});
                        var subAddress3 = subsidiarySubRecord.getValue({ "fieldId": "addr3"});
                        var subCity = subsidiarySubRecord.getValue({ "fieldId": "city"});
                        var subPostcode = subsidiarySubRecord.getValue({ "fieldId": "zip"});
                        var subState = subsidiarySubRecord.getValue({ "fieldId": "state"}) || subsidiarySubRecord.getValue({ "fieldId": "city"});
                        var subCountry = subsidiarySubRecord.getText({ "fieldId": "country"});

                        addressArray = [subAddress1,subAddress2,subAddress3,subCity,subState,subCountry,subPostcode];
                        log.debug('addressarray',addressArray);

                        subsidiaryAddress = mergeAddress(addressArray);

                        subsidiaryPhone = objSubsidiary.getValue({fieldId:'custrecord_ss_anz_sub_phone'});
                        subsidiaryGST = objSubsidiary.getValue({fieldId:'federalidnumber'});

                    }

                    totalamountfooter = parseFloat(totalamountfooter).toFixed(2);
                    totalpercentagefooter = parseFloat(totalpercentagefooter).toFixed(2);
                    totalthismonthpercentagefooter = parseFloat(totalthismonthpercentagefooter).toFixed(2);
                    cumpercentagefooter = parseFloat(cumpercentagefooter).toFixed(2);
                    cumamountfooter = parseFloat(cumamountfooter).toFixed(2);
                    totalamountfooter1 = parseFloat(totalamountfooter1).toFixed(2);
                    totalqty = parseFloat(totalqty).toFixed(2);
                    totalprevamount = parseFloat(totalprevamount).toFixed(2);
                    totalprevqty = parseFloat(totalprevqty).toFixed(2);
                    totalthismonthqty = parseFloat(totalthismonthqty).toFixed(2);
                    totalthismonthamount = parseFloat(totalthismonthamount).toFixed(2);
                    cumamountfooter1 = parseFloat(cumamountfooter1).toFixed(2);
                    totalprevamount1 = parseFloat(totalprevamount1).toFixed(2);
                    totalthismonthamount1 = parseFloat(totalthismonthamount1).toFixed(2);


                    totalpercentagefooter1 = parseFloat(totalprevamount1)/parseFloat(totalamountfooter1);
                    totalpercentagefooter1 = parseFloat(totalpercentagefooter1).toFixed(2);
                    totalpercentagefooter = parseFloat(totalprevamount)/parseFloat(totalamountfooter);
                    totalpercentagefooter = parseFloat(totalpercentagefooter).toFixed(2);

                    totalthismonthpercentagefooter1 = parseFloat(totalthismonthamount1)/parseFloat(totalamountfooter1);
                    totalthismonthpercentagefooter1 = parseFloat(totalthismonthpercentagefooter1).toFixed(2);
                    totalthismonthpercentagefooter = parseFloat(totalthismonthamount)/parseFloat(totalamountfooter);
                    totalthismonthpercentagefooter = parseFloat(totalthismonthpercentagefooter).toFixed(2);

                    cumpercentagefooter1 = parseFloat(cumamountfooter1)/parseFloat(totalamountfooter1);
                    cumpercentagefooter1 = parseFloat(cumpercentagefooter1).toFixed(2);
                    cumpercentagefooter = parseFloat(cumamountfooter)/parseFloat(totalamountfooter);
                    cumpercentagefooter = parseFloat(cumpercentagefooter).toFixed(2);

                    lbdcertificatefooter = parseFloat(lbdcertificatefooter).toFixed(2);
                    differencefooter = parseFloat(differencefooter).toFixed(2);
                    lbdcertificatefooter1 = parseFloat(lbdcertificatefooter1).toFixed(2);
                    differencefooter1 = parseFloat(differencefooter1).toFixed(2);

                    var data = {
                        address: customeraddress.replace(/&/g, "&amp;"),
                        attn: customerattn.replace(/&/g, "&amp;"),
                        customername: customerName.replace(/&/g, "&amp;"),
                        date: claimDate,
                        projectname: projectName,
                        claimno: claimProgressiveNo,
                        claimlabel:claimLabel,
                        claimrevno:claimRevNo,
                        subsidiarylogo:subsidiaryLogo,
                        subsidiaryName:subsidiaryName,
                        subsidiaryAddress:subsidiaryAddress,
                        subsidiaryPhone: subsidiaryPhone,
                        subsidiaryGST:subsidiaryGST,

                        totalqty:numberWithCommas(totalqty),
                        totalamount:numberWithCommas(totalamountfooter),
                        totalpercentagefooter:totalpercentagefooter,
                        totalprevamount:numberWithCommas(totalprevamount),
                        totalprevqty:numberWithCommas(totalprevqty),
                        totalthismonthqty:numberWithCommas(totalthismonthqty),
                        totalthismonthamount:numberWithCommas(totalthismonthamount),
                        totalthismonthpercentagefooter:totalthismonthpercentagefooter,
                        cumpercentagefooter:cumpercentagefooter,
                        cumamountfooter:numberWithCommas(cumamountfooter),

                        totalamount1:numberWithCommas(totalamountfooter1),
                        totalpercentagefooter1:totalpercentagefooter1,
                        totalthismonthpercentagefooter1:totalthismonthpercentagefooter1,
                        cumpercentagefooter1:cumpercentagefooter1,
                        cumamountfooter1:numberWithCommas(cumamountfooter1),
                        totalprevamount1:numberWithCommas(totalprevamount1),
                        totalthismonthamount1: numberWithCommas(totalthismonthamount1),

                        amountofthispaymentclaim:numberWithCommas(amountofthispaymentclaim),
                        amountofthispaymentclaimgst:numberWithCommas(amountofthispaymentclaimgst),
                        amountofthispaymentclaimfinal:numberWithCommas(amountofthispaymentclaimfinal),

                        lbdcertificatefooter:(lbdcertificatefooter),
                        lbdcertificatefooter1:(lbdcertificatefooter1),
                        differencefooter:(differencefooter),
                        differencefooter1:(differencefooter1),

                        orderdata: orderArray,
                        variationorderdata:variationOrderArray
                    };

                    var crId = 0;
                    var crObj = record.create({
                        type: 'customrecord_ps_projectclaim_pdf_data'
                    });
                    crObj.setValue({
                        fieldId: 'custrecord_ps_claim_pdf_jsondata',
                        value: JSON.stringify(data)
                    });
                    crId = crObj.save();

                    //call print pdf suitelet
                    redirect.toSuitelet({
                        scriptId: 'customscript_ps_sl_projectclaim_pdf',
                        deploymentId: 'customdeploy_ps_sl_projectclaim_pdf',
                        parameters: {
                            'custscript_crid': crId
                        }
                    });
                }
            } else {
                const projectTotals = {};
                var projectId = parseInt(context.request.parameters.projectid, 10) || 0;
                if (!projectId || projectId != "") {
                    var pageIndex = parseInt(context.request.parameters.page, 10) || 0;
                    maxLimit = 10;
                    var selectedProject = projectId;
                    var selectedCustomer = 0;
                    let selectedClaimNo = 'create_new';
                    var selectedClaimDate = "";
                    if (context.request.method == 'GET') {
                        if (context.request.parameters.claimdate && context.request.parameters.claimdate != '') {
                            selectedClaimDate = context.request.parameters.claimdate;
                            selectedClaimDate = moment.utc(selectedClaimDate, 'DD/MM/YYYY').toDate();
                        } else {
                            selectedClaimDate = new Date();
                        }
                        if (context.request.parameters.progressiveClaimNumber) {
                            selectedClaimNo = context.request.parameters.progressiveClaimNumber;
                        }
                    }

                    var pdfCheckbox = form.addField({
                        id: 'custpage_pdf',
                        type: serverWidget.FieldType.CHECKBOX,
                        label: 'Is PDF print'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    var fieldgroup = form.addFieldGroup({
                        id: 'fieldgroupInterest1',
                        label: 'Project Claim'
                    });

                    form.clientScriptModulePath = './ps_cs_project_claims.js';
                    form.addButton({
                        id: 'btnBack',
                        label: 'Go Back to Project',
                        functionName: 'back_project(' + projectId + ')'
                    });
                    form.addButton({
                        id: 'btnRefresh',
                        label: 'Refresh',
                        functionName: 'refreshPage()'
                    });
                    form.addButton({
                        id: 'btnCreateInvoice',
                        label: 'Create Invoice',
                        functionName: 'createInvoice()'
                    });
                    form.addButton({
                        id: 'btnprint',
                        label: 'Print PDF',
                        functionName: 'printPDF(' + projectId + ')'
                    });

                    //get project data
                    var objProject = record.load({
                        type: 'job',
                        id: projectId
                    });

                    var selectedCustomer = objProject.getValue({
                        fieldId: 'parent'
                    })
                    var selectedSubsidiary = objProject.getValue({
                        fieldId: 'subsidiary'
                    });
                    const retentionPercentage = objProject.getValue({
                        fieldId: 'custentity_ps_boq_retentionpercentage'
                    }) || 0;
                    const maxRetentionAmount = objProject.getValue({
                        fieldId: 'custentity_max_retention_amount'
                    }) || 0;
                    let retentionAmount = 0;

                    var fieldCustomer = form.addField({
                        id: 'custpage_customer',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Customer',
                        container: 'fieldgroupInterest1',
                        source: 'customer'
                    });
                    fieldCustomer.layoutType = serverWidget.FieldLayoutType.NORMAL;
                    fieldCustomer.isMandatory = false;
                    if (selectedCustomer > 0) {
                        fieldCustomer.defaultValue = selectedCustomer;
                    }
                    fieldCustomer.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });

                    var fieldSubsidiary = form.addField({
                        id: 'custpage_subsidiary',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiary',
                        container: 'fieldgroupInterest1',
                        source: 'subsidiary'
                    });

                    if (selectedSubsidiary > 0) {
                        fieldSubsidiary.defaultValue = selectedSubsidiary;
                    }
                    fieldSubsidiary.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    var fieldAttn =  form.addField({
                        id: 'custpage_customer_attn',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Customer Attn',
                        container: 'fieldgroupInterest1'
                    });
                    fieldAttn.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    var fieldAddress = form.addField({
                        id: 'custpage_customer_address',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Customer Address',
                        container: 'fieldgroupInterest1'
                    });

                    var customerAttn = '';
                    if (selectedCustomer && selectedCustomer > 0) {
                        var customerRec = record.load({
                            type: 'customer',
                            id: selectedCustomer
                        });
                        var add_Count = customerRec.getLineCount('addressbook');
                        for (var i = 0; i < add_Count; i++) {
                            var anAddress = customerRec.getSublistSubrecord('addressbook', 'addressbookaddress', i);
                            var country = anAddress.getValue({
                                fieldId: 'country'
                            });
                            var addressArray = [];
                            addressArray[0] = anAddress.getValue({
                                fieldId: 'attention'
                            });
                            addressArray[1] = anAddress.getValue({
                                fieldId: 'addressee'
                            });
                            addressArray[2] = anAddress.getValue({
                                fieldId: 'addr1'
                            });
                            addressArray[3] = anAddress.getValue({
                                fieldId: 'addr2'
                            });
                            addressArray[4] = anAddress.getValue({
                                fieldId: 'city'
                            });
                            addressArray[5] = anAddress.getValue({
                                fieldId: 'state'
                            }) + anAddress.getValue({
                                fieldId: 'custrecord_ps_shipping_zone'
                            });
                            addressArray[6] = anAddress.getValue({
                                fieldId: 'zip'
                            });
                            addressArray[7] = anAddress.getText({
                                fieldId: 'country'
                            });

                            customerAttn = addressArray[0];

                            //addressArray[0]= '';
                            var customerAddress = concatAddress(addressArray);

                            fieldAddress.addSelectOption({
                                value: customerAddress,
                                text: customerAddress
                            });

                            fieldAttn.addSelectOption({
                                value: addressArray[0] || '',
                                text: addressArray[0] || ''
                            });
                        }
                    }
                    fieldAddress.defaultValue = customerAddress;

                    var fieldAddress1 = form.addField({
                        id: 'custpage_customer_address1',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'Customer Address Selected',
                        container: 'fieldgroupInterest1'
                    });
                    fieldAddress1.defaultValue = removeAttn(customerAddress);
                    fieldAddress1.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTROW
                    });

                    var fieldAttn1 = form.addField({
                        id: 'custpage_customer_attn1',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Attention',
                        container: 'fieldgroupInterest1'
                    });
                    fieldAttn1.defaultValue = customerAttn;
                    fieldAttn.defaultValue = customerAttn;

                    var revisionNoField = form.addField({
                        id: 'custpage_revision_no',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Revision No',
                        container: 'fieldgroupInterest1'
                    });

                    var fieldProgressiveClaimNo = form.addField({
                        id: 'custpage_progressiveclaimno',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Progressive Claim No',
                        container: 'fieldgroupInterest1'
                    });
                    fieldProgressiveClaimNo.layoutType = serverWidget.FieldLayoutType.NORMAL;
                    fieldProgressiveClaimNo.addSelectOption({
                        value: 'create_new',
                        text: '-New-'
                    });
                    //get claim data
                    var searchData = search.load({
                        id: 'customsearch_ps_claims_progress_num'
                    });

                    if (projectId) {
                        var filter1 = search.createFilter({
                            name: "custrecord_ps_boq_claims_project",
                            operator: search.Operator.ANYOF,
                            values: [projectId]
                        });
                        searchData.filters.push(filter1);
                    }

                    var searchDataResult = searchData.run().getRange(0, 100) || [];
                    var currentClaimNo = 0;

                    for (var hd = 0; hd < searchDataResult.length; hd++) {
                        var result = searchDataResult[hd];
                        currentClaimNo = result.getValue({
                            'name': "custrecord_ps_boq_claims_claimno",
                            summary: search.Summary.GROUP
                        }) || 0;
                        var currentClaimNo1 = currentClaimNo;

                        if (currentClaimNo.length < 2) {
                            currentClaimNo1 = '0' + currentClaimNo;
                        }

                        fieldProgressiveClaimNo.addSelectOption({
                            value: currentClaimNo,
                            text: currentClaimNo1
                        });
                    }

                    var returnClaimNo = parseInt(currentClaimNo) + 1;
                    var returnClaimNo1 = returnClaimNo.toString();

                    if(returnClaimNo1.length<2)
                    {
                        returnClaimNo1 = returnClaimNo1;
                    }
                    if(selectedClaimNo)
                    {
                        fieldProgressiveClaimNo.defaultValue = selectedClaimNo;
                    }

                    var newClaimNumberField = form.addField({
                        id: 'custpage_new_claim_number',
                        type: serverWidget.FieldType.TEXT,
                        label: 'New Claim Number',
                        container : 'fieldgroupInterest1'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    newClaimNumberField.defaultValue = returnClaimNo1;

                    var fieldStartDate = form.addField({
                        id: 'custpage_claimdate',
                        type: serverWidget.FieldType.DATE,
                        label: 'Claim Date',
                        container: 'fieldgroupInterest1'
                    });
                    fieldStartDate.layoutType = serverWidget.FieldLayoutType.NORMAL;
                    fieldStartDate.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTROW
                    });
                    fieldStartDate.isMandatory = false;
                    if (selectedClaimDate) {
                        fieldStartDate.defaultValue = selectedClaimDate;
                    }

                    var fieldOverallProjectPrice = form.addField({
                        id: 'custpage_overall_project_price',
                        type: serverWidget.FieldType.CURRENCY,
                        label: 'Overall Project Price',
                        container: 'fieldgroupInterest1'
                    });
                    fieldOverallProjectPrice.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    var fieldProgressiveLabel = form.addField({
                        id: 'custpage_label',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Contact Reference (Notification of Award)',
                        container: 'fieldgroupInterest1'
                    });
                    fieldProgressiveLabel.layoutType = serverWidget.FieldLayoutType.NORMAL;

                    var fieldProject = form.addField({
                        id: 'custpage_project',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Project',
                        container: 'fieldgroupInterest1',
                        source: 'job'
                    });

                    fieldProject.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTROW
                    });
                    fieldProject.isMandatory = false;
                    if (selectedProject > 0) {
                        fieldProject.defaultValue = selectedProject;
                    }
                    fieldProject.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });

                    //TOTAL DATA
                    {
                        // Contract total 
                        {
                            var fieldgroup = form.addFieldGroup({
                                id: 'fieldgroupTotal',
                                label: 'Total Contract Sum'
                            });
                            var fieldTotalQty = form.addField({
                                id: 'custpage_total_qty',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Quantity',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalQty.updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTROW
                            });
                            fieldTotalQty.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var fieldTotalAmount = form.addField({
                                id: 'custpage_total_amount',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Amount',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalAmount.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var fieldTotalPrevQty = form.addField({
                                id: 'custpage_total_prev_qty',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Prev Month Quantity',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalPrevQty.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var fieldTotalPrevAmount = form.addField({
                                id: 'custpage_total_prev_amount',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Prev Month Amount',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalPrevAmount.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var fieldTotalThisMonthQty = form.addField({
                                id: 'custpage_total_thismonth_qty',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total This Month Quantity',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalThisMonthQty.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            fieldTotalThisMonthQty.defaultValue = 0;
                            var fieldTotalThisMonthAmount = form.addField({
                                id: 'custpage_total_thismonth_amount',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total This Month Amount',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalThisMonthAmount.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            fieldTotalThisMonthAmount.defaultValue = 0;
                            var fieldTotalCumQty = form.addField({
                                id: 'custpage_total_cum_qty',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Cumulative Quantity',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalCumQty.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var fieldTotalCumAmount = form.addField({
                                id: 'custpage_total_cum_amount',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Cumulative Amount',
                                container: 'fieldgroupTotal'
                            });
                            fieldTotalCumAmount.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var contract_total_qty = 0;
                            var contract_total_amount = 0;
                            var contract_total_prev_qty = 0;
                            var contract_total_prev_amount = 0;
                            var contract_total_claim_amount = 0;
                        }

                        //Variation orders total
                        {
                            var fieldgroup = form.addFieldGroup({
                                id: 'fieldgroupTotal1',
                                label: 'Total Variation Sum'
                            });

                            var fieldTotalQty1 = form.addField({
                                id: 'custpage_total_qty1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Quantity',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalQty1.updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTROW
                            });
                            fieldTotalQty1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalAmount1 = form.addField({
                                id: 'custpage_total_amount1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Amount',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalAmount1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalPrevQty1 = form.addField({
                                id: 'custpage_total_prev_qty1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Prev Month Quantity',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalPrevQty1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalPrevAmount1 = form.addField({
                                id: 'custpage_total_prev_amount1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Prev Month Amount',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalPrevAmount1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalThisMonthQty1 = form.addField({
                                id: 'custpage_total_thismonth_qty1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total This Month Quantity',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalThisMonthQty1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            fieldTotalThisMonthQty1.defaultValue = 0;

                            var fieldTotalThisMonthAmount1 = form.addField({
                                id: 'custpage_total_thismonth_amount1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total This Month Amount',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalThisMonthAmount1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            fieldTotalThisMonthAmount1.defaultValue = 0;

                            var fieldTotalCumQty1 = form.addField({
                                id: 'custpage_total_cum_qty1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Cumulative Quantity',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalCumQty1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalCumAmount1 = form.addField({
                                id: 'custpage_total_cum_amount1',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Cumulative Amount',
                                container: 'fieldgroupTotal1'
                            });

                            fieldTotalCumAmount1.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var contract_total_qty1 = 0;
                            var contract_total_amount1 = 0;
                            var contract_total_prev_qty1 = 0;
                            var contract_total_prev_amount1 = 0;
                            var contract_total_claim_amount1 = 0;
                        }

                        //Total for contract and variation orders
                        {
                            var fieldgroup = form.addFieldGroup({
                                id: 'fieldgroupTotal2',
                                label: 'Total Contract & VO Sum'
                            });

                            var fieldTotalAmount2 = form.addField({
                                id: 'custpage_total_amount2',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Amount',
                                container: 'fieldgroupTotal2'
                            });

                            fieldTotalAmount2.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalPrevAmount2 = form.addField({
                                id: 'custpage_total_prev_amount2',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Prev Month Amount',
                                container: 'fieldgroupTotal2'
                            });

                            fieldTotalPrevAmount2.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalThisMonthAmount2 = form.addField({
                                id: 'custpage_total_thismonth_amount2',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total This Month Amount',
                                container: 'fieldgroupTotal2'
                            });

                            fieldTotalThisMonthAmount2.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var fieldTotalCumAmount2 = form.addField({
                                id: 'custpage_total_cum_amount2',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Cumulative Amount',
                                container: 'fieldgroupTotal2'
                            });

                            fieldTotalCumAmount2.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });

                            var maxRetentionAmountField = form.addField({
                                id: 'max_retention_amount',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Max Retention Amount',
                                container: 'fieldgroupTotal2'
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            maxRetentionAmountField.defaultValue = maxRetentionAmount;

                            retentionAmount = getRetentionAmount(projectId, maxRetentionAmount);

                            var fieldRetentionCalc = form.addField({
                                id: 'custpage_retention_calc',
                                type: serverWidget.FieldType.TEXT,
                                label: `Total Cumulative Retention (${retentionPercentage}%)`,
                                container: 'fieldgroupTotal2'
                            });

                            var retentionPercentageField = form.addField({
                                id: 'retention_percentage',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Retention Percentage',
                                container: 'fieldgroupTotal2'
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            }).defaultValue = retentionPercentage;

                            fieldRetentionCalc.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            fieldRetentionCalc.defaultValue = retentionAmount;

                            var fieldTotalCertifiedCumulativeAmount = form.addField({
                                id: 'total_certified_cumulative_amount',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Certified Cumulative Amount',
                                container: 'fieldgroupTotal2'
                            });

                            var fieldTotalAmountClaimed = form.addField({
                                id: 'custpage_totalamountclaimed',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Total Amount Claimed',
                                container: 'fieldgroupTotal2'
                            });

                            fieldTotalAmountClaimed.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }

                        //Billing
                        {
                            var fieldgroup = form.addFieldGroup({
                                id: 'fieldgroupTotal3',
                                label: 'Billing'
                            });
                            var fieldCurrentMonthCumCerAmount = form.addField({
                                id: 'currentmonth_cumceramount',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Current Month Cumulative Certified Amount',
                                container: 'fieldgroupTotal3'
                            });
                            var currentMonthRetentionField = form.addField({
                                id: 'currentmonth_retention',
                                type: serverWidget.FieldType.TEXT,
                                label: 'Current Month Retention',
                                container: 'fieldgroupTotal3'
                            });
                            var fieldTobeInvoiced = form.addField({
                                id: 'custpage_tobeinvoiced',
                                type: serverWidget.FieldType.TEXT,
                                label: 'To be Invoiced',
                                container: 'fieldgroupTotal3'
                            });
                            fieldTobeInvoiced.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }
                    }

                    //sublist
                    {
                        let totalThisMonthQuantityHeader = 0;
                        let totalThisMonthAmountHeader = 0;
                        let totalThisMonthQuantityVariationHeader = 0;
                        let totalThisMonthAmountVariationHeader = 0;
                        let totalCurrentMonthCumulativeCertifiedAmount = 0.00;
                        const allPreviousProjectClaims = fetchAllPreviousProjectClaims(selectedProject);
                        
                        //Contract orders sublist add fields
                        {
                            var orderSublist = form.addSublist({
                            id: 'sublist_orders',
                            type: serverWidget.SublistType.LIST,
                            label: 'Orders'
                            });

                            selectLoanRadioField = orderSublist.addField({
                                id: 'orders_check',
                                type: serverWidget.FieldType.CHECKBOX,
                                label: 'Select',
                                source: 'orders_selected'
                            });

                            var projectClaimId = orderSublist.addField({
                                id: 'claim_id',
                                label: 'Claim ID',
                                type: serverWidget.FieldType.TEXT
                            });

                            var lineDescription = orderSublist.addField({
                                id: 'desc',
                                label: 'Description',
                                type: serverWidget.FieldType.TEXT
                            });
                            var lblIsVariationline = orderSublist.addField({
                                id: 'is_variation_line',
                                label: 'Variation Order',
                                type: serverWidget.FieldType.CHECKBOX
                            });
                            lblIsVariationline.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            var lineDescription = orderSublist.addField({
                                id: 'unit',
                                label: 'Unit',
                                type: serverWidget.FieldType.TEXT
                            });
                            var lblBoqSalesOrder = orderSublist.addField({
                                id: 'boq_sales_order',
                                label: 'BOQ Sales Order',
                                type: serverWidget.FieldType.TEXT
                            });
                            lblBoqSalesOrder.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            var lblClaimInvoice = orderSublist.addField({
                                id: 'claim_invoice',
                                label: 'Claim Invoice',
                                type: serverWidget.FieldType.TEXT
                            });
                            lblClaimInvoice.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            var lineClainAmount = orderSublist.addField({
                                id: 'custpage_boq_quantity',
                                label: 'Quantity',
                                type: serverWidget.FieldType.FLOAT
                            });
                            var lineDescription = orderSublist.addField({
                                id: 'rate',
                                label: 'Rate',
                                type: serverWidget.FieldType.TEXT
                            });
                            var lineClainAmount = orderSublist.addField({
                                id: 'claimable_amount',
                                label: 'Total Amount',
                                type: serverWidget.FieldType.CURRENCY
                            });
                            var linePrevClaim = orderSublist.addField({
                                id: 'prev_claim_qty',
                                label: 'Previous Cum. Claim Quantity',
                                type: serverWidget.FieldType.TEXT
                            });
                            var linePrevClaim = orderSublist.addField({
                                id: 'prev_claim_percentage',
                                label: 'Previous Cum. Claim Percentage',
                                type: serverWidget.FieldType.TEXT
                            });
                            var linePrevClaim = orderSublist.addField({
                                id: 'prev_claim',
                                label: 'Previous Cum. Claim',
                                type: serverWidget.FieldType.TEXT
                            });
                            var lineClaimQuantityEd = orderSublist.addField({
                                id: 'quantity_editable',
                                label: 'This Month Quantity',
                                type: serverWidget.FieldType.TEXT
                            });
                            lineClaimQuantityEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            var lineClaimPercEd = orderSublist.addField({
                                id: 'perc_editable',
                                label: 'This Month Percentage',
                                type: serverWidget.FieldType.TEXT
                            });
                            lineClaimPercEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            var lineClaimAmountEd = orderSublist.addField({
                                id: 'this_month_amount',
                                label: 'This Month Total Amount',
                                type: serverWidget.FieldType.TEXT
                            });
                            lineClaimAmountEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            lineClaimAmountEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var cumqtyEd = orderSublist.addField({
                                id: 'cumulative_qty',
                                label: 'Cumulative Quantity',
                                type: serverWidget.FieldType.TEXT
                            });
                            cumqtyEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            cumqtyEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var cumpercEd = orderSublist.addField({
                                id: 'cumulative_perc',
                                label: 'Cumulative Percentage',
                                type: serverWidget.FieldType.TEXT
                            });
                            cumpercEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            cumpercEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var cumtotalEd = orderSublist.addField({
                                id: 'cumulative_total',
                                label: 'Cumulative Total',
                                type: serverWidget.FieldType.TEXT
                            });
                            cumtotalEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            cumtotalEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var cumtotalEd = orderSublist.addField({
                                id: 'total_claim_amount',
                                label: 'Total Claim Amount',
                                type: serverWidget.FieldType.TEXT
                            });
                            cumtotalEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            cumtotalEd.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var lblOutstandingClaims = orderSublist.addField({
                                id: 'outstanding_claims',
                                label: 'Outstanding Claims',
                                type: serverWidget.FieldType.TEXT
                            });
                            
                            var lbdCertificationField = orderSublist.addField({
                                id: 'lbd_certification',
                                label: 'Customer Certification',
                                type: serverWidget.FieldType.TEXT
                            });
                            lbdCertificationField.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            var difference = orderSublist.addField({
                                id: 'difference',
                                label: 'Difference',
                                type: serverWidget.FieldType.TEXT
                            });
                            difference.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            difference.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            var remarks = orderSublist.addField({
                                id: 'remarks',
                                label: 'Remarks',
                                type: serverWidget.FieldType.TEXT
                            });
                            remarks.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            var certifiedClaim = orderSublist.addField({
                                id: 'certified_claim',
                                label: 'Current Month Certified Claim',
                                type: serverWidget.FieldType.TEXT
                            });
                            certifiedClaim.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.ENTRY
                            });
                            var lblCertifiedClaimPercentage = orderSublist.addField({
                                id: 'certified_claim_percentage',
                                label: 'Certified Claim %',
                                type: serverWidget.FieldType.TEXT
                            });
                            lblCertifiedClaimPercentage.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            previousPageButton = orderSublist.addButton({
                                id: 'previous_page',
                                label: 'Previous Page',
                                functionName: "changePage(" + parseInt(pageIndex - 1) + ")"
                            });

                            if ((pageIndex - 1) < 0) {
                                previousPageButton.isDisabled = true;
                            }
                            nextPageButton = orderSublist.addButton({
                                id: 'next_page',
                                label: 'Next Page',
                                functionName: "changePage(" + parseInt(pageIndex + 1) + ")"
                            });
                            orderSublist.addMarkAllButtons();
                        }

                        /* ADD SUBLIST VALUES */

                        var searchOrders = search.load({
                            id: 'customsearch_ps_projectclaims_2'
                        });

                        var defaultFilters = searchOrders.filters;
                        defaultFilters.push(search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.ANYOF,
                            values: selectedProject
                        }));
                        searchOrders.filters = defaultFilters;
                        /* paging */
                        minRange = pageIndex * maxLimit;
                        maxRange = (minRange + maxLimit);
                        var totalTransactionCount = 0;
                        var pagedData = searchOrders.runPaged({
                            pageSize: 1000
                        });

                        totalTransactionCount = pagedData.count;
                        var lastPageNumber = Math.ceil(totalTransactionCount / maxLimit);
                        if ((pageIndex + 1) >= lastPageNumber) {
                            nextPageButton.isDisabled = true;
                        }
                        /* paging */

                        var searchOrdersResultSet = searchOrders.run().getRange(minRange, maxRange) || [];
                        var totalClaimableAmount = 0;
                        var totalClaimAmount = 0;
                        var totalCertifiedAmount = 0;

                        var variationOrders = [];

                        if (searchOrdersResultSet.length > 0) {
                            var s = 0;
                            var addedLines = 0;
                            while (s < searchOrdersResultSet.length) {

                                var result = searchOrdersResultSet[s];
                                var Desc = result.getValue(result.columns[0]);
                                var unit = result.getValue(result.columns[5]) || '-';
                                var rate = result.getValue(result.columns[6]) || 0.00;
                                var claimableAmount = result.getValue(result.columns[1]) || 0.00;
                                var boqQty = result.getValue(result.columns[2]) || 0;
                                var isVariationLine = result.getValue(result.columns[3]) || false;
                                if (isVariationLine) {
                                    variationOrders.push(result);
                                }
                                var salesOrder = result.getValue(result.columns[4]) || '';

                                var prevClaims = getLinePreviousAndCurrentClaimValues(allPreviousProjectClaims, Desc, isVariationLine, selectedClaimNo);
                                var claimId = prevClaims.claimId || null;
                                var prevClaimAmount = prevClaims.prevClaimAmount || 0.00;
                                var prevClaimQuantity = prevClaims.prevClaimQuantity || 0;
                                var previousClaimPercentage = prevClaims.previousClaimPercentage || 0;
                                var claimRemarks = prevClaims.claimRemarks || "-";
                                var certifiedAmount = prevClaims.certifiedAmount || 0.00;
                                var certifiedClaimPercentage = prevClaims.certifiedClaimPercentage || 0;

                                var currentClaim = prevClaims.currentClaim || 0.00;
                                var currentCertifiedClaim = prevClaims.currentCertifiedClaim || 0.00;
                                var currentClaimPercentage = prevClaims.currentClaimPercentage || 0;
                                var currentClaimQuantity = prevClaims.currentClaimQuantity || 0;
                                var claimInvoice = prevClaims.claimInvoice || null;


                                if (!isVariationLine) {
                                    orderSublist.setSublistValue({
                                        id: 'orders_check',
                                        line: addedLines,
                                        value: 'F'
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'claim_id',
                                        line: addedLines,
                                        value: claimId
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'desc',
                                        line: addedLines,
                                        value: Desc
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'is_variation_line',
                                        line: addedLines,
                                        value: isVariationLine == true ? 'T' : 'F'
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'unit',
                                        line: addedLines,
                                        value: unit
                                    });
                                    if (salesOrder) {
                                        orderSublist.setSublistValue({
                                            id: 'boq_sales_order',
                                            line: addedLines,
                                            value: salesOrder
                                        });
                                    }
                                    if(claimInvoice) {
                                        orderSublist.setSublistValue({
                                            id: 'claim_invoice',
                                            line: addedLines,
                                            value: claimInvoice
                                        });
                                    }
                                    orderSublist.setSublistValue({
                                        id: 'custpage_boq_quantity',
                                        line: addedLines,
                                        value: boqQty || 0
                                    });

                                    contract_total_qty = parseFloat(contract_total_qty) + parseFloat(boqQty);

                                    orderSublist.setSublistValue({
                                        id: 'this_month_amount',
                                        line: addedLines,
                                        value: currentClaim
                                    });
                                    totalThisMonthAmountHeader += currentClaim;

                                    const lineCumulativeQty = parseFloat(prevClaimQuantity) + parseFloat(currentClaimQuantity);
                                    orderSublist.setSublistValue({
                                        id: 'cumulative_qty',
                                        line: addedLines,
                                        value: lineCumulativeQty
                                    });

                                    const lineCumulativePercentage = (parseFloat(previousClaimPercentage) + parseFloat(currentClaimPercentage)).toFixed(2);
                                    orderSublist.setSublistValue({
                                        id: 'cumulative_perc',
                                        line: addedLines,
                                        value: lineCumulativePercentage
                                    });

                                    const lineCumulativeTotal = (parseFloat(prevClaimAmount) + parseFloat(currentClaim)).toFixed(2);
                                    orderSublist.setSublistValue({
                                        id: 'cumulative_total',
                                        line: addedLines,
                                        value: lineCumulativeTotal
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'total_claim_amount',
                                        line: addedLines,
                                        value: prevClaimAmount
                                    });
                                    contract_total_claim_amount = parseFloat(contract_total_claim_amount) + parseFloat(prevClaimAmount);

                                    orderSublist.setSublistValue({
                                        id: 'rate',
                                        line: addedLines,
                                        value: rate
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'claimable_amount',
                                        line: addedLines,
                                        value: claimableAmount
                                    });
                                    totalClaimableAmount = totalClaimableAmount + parseFloat(claimableAmount);
                                    contract_total_amount = contract_total_amount + parseFloat(claimableAmount);

                                    orderSublist.setSublistValue({
                                        id: 'prev_claim',
                                        line: addedLines,
                                        value: prevClaimAmount
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'prev_claim_qty',
                                        line: addedLines,
                                        value: prevClaimQuantity
                                    });
                                    contract_total_prev_qty = contract_total_prev_qty + parseFloat(prevClaimQuantity);

                                    orderSublist.setSublistValue({
                                        id: 'prev_claim_percentage',
                                        line: addedLines,
                                        value: previousClaimPercentage
                                    });
                                    totalClaimAmount = totalClaimAmount + parseFloat(prevClaimAmount);
                                    orderSublist.setSublistValue({
                                        id: 'prev_claim_certified',
                                        line: addedLines,
                                        value: certifiedAmount
                                    });
                                    totalCertifiedAmount = totalCertifiedAmount + parseFloat(certifiedAmount);
                                    contract_total_prev_amount = contract_total_prev_amount + parseFloat(prevClaimAmount);
                                    var outstandingClaimsValue = parseFloat(claimableAmount) - parseFloat(certifiedAmount);

                                    orderSublist.setSublistValue({
                                        id: 'outstanding_claims',
                                        line: addedLines,
                                        value: outstandingClaimsValue.toFixed(2)
                                    });
                                  
                                    orderSublist.setSublistValue({
                                        id: 'certified_claim',
                                        line: addedLines,
                                        value: currentCertifiedClaim
                                    });
                                    totalCurrentMonthCumulativeCertifiedAmount += parseFloat(currentCertifiedClaim);
                                    if (certifiedClaimPercentage) {
                                        orderSublist.setSublistValue({
                                            id: 'certified_claim_percentage',
                                            line: addedLines,
                                            value: certifiedClaimPercentage
                                        });
                                    }
                                    orderSublist.setSublistValue({
                                        id: 'difference',
                                        line: addedLines,
                                        value: 0
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'remarks',
                                        line: addedLines,
                                        value: claimRemarks || ''
                                    });
                                    orderSublist.setSublistValue({
                                        id: 'quantity_editable',
                                        line: addedLines,
                                        value: currentClaimQuantity
                                    });
                                    totalThisMonthQuantityHeader += currentClaimQuantity;
                                    orderSublist.setSublistValue({
                                        id: 'perc_editable',
                                        line: addedLines,
                                        value: currentClaimPercentage
                                    });

                                    addedLines++;
                                }

                                s++;
                            }
                            form.addSubmitButton({
                                label: 'Submit'
                            });

                            //show total values
                            projectTotals.fieldTotalQty = contract_total_qty;
                            projectTotals.fieldTotalAmount = contract_total_amount.toFixed(2);
                            projectTotals.fieldTotalPrevQty = contract_total_prev_qty;
                            projectTotals.fieldTotalPrevAmount = contract_total_prev_amount.toFixed(2);
                            projectTotals.fieldTotalThisMonthQty = totalThisMonthQuantityHeader;
                            projectTotals.fieldTotalThisMonthAmount = parseFloat(totalThisMonthAmountHeader).toFixed(2);
                            projectTotals.fieldTotalCumQty = projectTotals.fieldTotalPrevQty + projectTotals.fieldTotalThisMonthQty;
                            projectTotals.fieldTotalCumAmount = (parseFloat(projectTotals.fieldTotalPrevAmount) + parseFloat(projectTotals.fieldTotalThisMonthAmount)).toFixed(2);
                        }
                        fieldOverallProjectPrice.defaultValue = totalClaimableAmount;

                        //Variation Sublist 
                        {
                            //Variation Sublist Add fields
                            {
                                var variationOrderSublist = form.addSublist({
                                id: 'sublist_orders1',
                                type: serverWidget.SublistType.LIST,
                                label: 'Variation Orders'
                                });
                                selectLoanRadioField1 = variationOrderSublist.addField({
                                    id: 'orders_check1',
                                    type: serverWidget.FieldType.CHECKBOX,
                                    label: 'Select',
                                    source: 'orders_selected'
                                });
                                var projectClaimId1 = variationOrderSublist.addField({
                                    id: 'claim_id1',
                                    label: 'Claim ID',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var lineDescription1 = variationOrderSublist.addField({
                                    id: 'desc1',
                                    label: 'Description',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var lblIsVariationline1 = variationOrderSublist.addField({
                                    id: 'is_variation_line1',
                                    label: 'Variation Order',
                                    type: serverWidget.FieldType.CHECKBOX
                                });
                                lblIsVariationline1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.HIDDEN
                                });
                                var lineDescription1 = variationOrderSublist.addField({
                                    id: 'unit1',
                                    label: 'Unit',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var lblBoqSalesOrder1 = variationOrderSublist.addField({
                                    id: 'boq_sales_order1',
                                    label: 'BOQ Sales Order',
                                    type: serverWidget.FieldType.TEXT
                                });
                                lblBoqSalesOrder1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.HIDDEN
                                });
                                var lblClaimInvoice1 = variationOrderSublist.addField({
                                    id: 'claim_invoice1',
                                    label: 'Claim Invoice',
                                    type: serverWidget.FieldType.TEXT
                                });
                                lblClaimInvoice1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.HIDDEN
                                });
                                var lineClainAmount1 = variationOrderSublist.addField({
                                    id: 'boq_quantity1',
                                    label: 'Quantity',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var lineDescription = variationOrderSublist.addField({
                                    id: 'rate1',
                                    label: 'Rate',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var lineClainAmount1 = variationOrderSublist.addField({
                                    id: 'claimable_amount1',
                                    label: 'Total Amount',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var linePrevClaim = variationOrderSublist.addField({
                                    id: 'prev_claim_qty1',
                                    label: 'Previous Cum. Claim Quantity',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var linePrevClaim = variationOrderSublist.addField({
                                    id: 'prev_claim_percentage1',
                                    label: 'Previous Cum. Claim Percentage',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var linePrevClaim1 = variationOrderSublist.addField({
                                    id: 'prev_claim1',
                                    label: 'Previous Cum. Claim',
                                    type: serverWidget.FieldType.TEXT
                                });
                                var lineClaimQuantityEd1 = variationOrderSublist.addField({
                                    id: 'quantity_editable1',
                                    label: 'This Month Quantity',
                                    type: serverWidget.FieldType.TEXT
                                });
                                lineClaimQuantityEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                var lineClaimPercEd1 = variationOrderSublist.addField({
                                    id: 'perc_editable1',
                                    label: 'This Month Percentage',
                                    type: serverWidget.FieldType.TEXT
                                });
                                lineClaimPercEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                var lineClaimAmountEd1 = variationOrderSublist.addField({
                                    id: 'this_month_amount1',
                                    label: 'This Month Total Amount',
                                    type: serverWidget.FieldType.TEXT
                                });
                                lineClaimAmountEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                lineClaimAmountEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });
                                var cumqtyEd1 = variationOrderSublist.addField({
                                    id: 'cumulative_qty1',
                                    label: 'Cumulative Quantity',
                                    type: serverWidget.FieldType.TEXT
                                });
                                cumqtyEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                cumqtyEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });

                                var cumpercEd1 = variationOrderSublist.addField({
                                    id: 'cumulative_perc1',
                                    label: 'Cumulative Percentage',
                                    type: serverWidget.FieldType.TEXT
                                });
                                cumpercEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                cumpercEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });

                                var cumtotalEd1 = variationOrderSublist.addField({
                                    id: 'cumulative_total1',
                                    label: 'Cumulative Total',
                                    type: serverWidget.FieldType.TEXT
                                });
                                cumtotalEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                cumtotalEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });

                                var cumtotalEd1 = variationOrderSublist.addField({
                                    id: 'total_claim_amount1',
                                    label: 'Total Claim Amount',
                                    type: serverWidget.FieldType.TEXT
                                });
                                cumtotalEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                cumtotalEd1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });

                                var lblOutstandingClaims1 = variationOrderSublist.addField({
                                    id: 'outstanding_claims1',
                                    label: 'Outstanding Claims',
                                    type: serverWidget.FieldType.TEXT
                                });

                                
                                var lbdCertificationField1 = variationOrderSublist.addField({
                                    id: 'lbd_certification1',
                                    label: 'Customer Certification',
                                    type: serverWidget.FieldType.TEXT
                                });
                                lbdCertificationField1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });

                                var difference1 = variationOrderSublist.addField({
                                    id: 'difference1',
                                    label: 'Difference',
                                    type: serverWidget.FieldType.TEXT
                                });
                                difference1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                difference1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.DISABLED
                                });

                                var remarks1 = variationOrderSublist.addField({
                                    id: 'remarks1',
                                    label: 'Remarks',
                                    type: serverWidget.FieldType.TEXT
                                });
                                remarks1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });
                                var certifiedClaim1 = variationOrderSublist.addField({
                                    id: 'certified_claim1',
                                    label: 'Current Month Certified Claim',
                                    type: serverWidget.FieldType.TEXT
                                });
                                certifiedClaim1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.ENTRY
                                });

                                var lblCertifiedClaimPercentage1 = variationOrderSublist.addField({
                                    id: 'certified_claim_percentage1',
                                    label: 'Certified Claim %',
                                    type: serverWidget.FieldType.TEXT
                                });
                                lblCertifiedClaimPercentage1.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.HIDDEN
                                });

                                previousPageButton1 = variationOrderSublist.addButton({
                                    id: 'previous_page',
                                    label: 'Previous Page',
                                    functionName: "changePage(" + parseInt(pageIndex - 1) + ")"
                                });

                                if ((pageIndex - 1) < 0) {
                                    previousPageButton.isDisabled = true;
                                }

                                nextPageButton = variationOrderSublist.addButton({
                                    id: 'next_page',
                                    label: 'Next Page',
                                    functionName: "changePage(" + parseInt(pageIndex + 1) + ")"
                                });
                                variationOrderSublist.addMarkAllButtons();
                            }

                            /* ADD SUBLIST VALUES */

                            var searchOrdersResultSet1 = variationOrders;
                            var totalClaimableAmount = 0;
                            var totalClaimAmount = 0;
                            var totalCertifiedAmount = 0;
                            var variationOrders = [];

                            if (searchOrdersResultSet1.length > 0) {
                                var s = 0;
                                var addedLines = 0;
                                while (s < searchOrdersResultSet1.length) {
                                    var result = searchOrdersResultSet1[s];
                                    var Desc = result.getValue(result.columns[0]);
                                    var unit = result.getValue(result.columns[5]);
                                    var rate = result.getValue(result.columns[6]) || 0;
                                    var claimableAmount = result.getValue(result.columns[1]) || 0.00;
                                    var boqQty = result.getValue(result.columns[2]) || 0;
                                    var isVariationLine = result.getValue(result.columns[3]) || false;
                                    var salesOrder = result.getValue(result.columns[4]) || '';

                                    var prevClaims = getLinePreviousAndCurrentClaimValues(allPreviousProjectClaims, Desc, isVariationLine, selectedClaimNo);
                                    var claimId = prevClaims.claimId || null;
                                    var prevClaimAmount = prevClaims.prevClaimAmount || 0.00;
                                    var prevClaimQuantity = prevClaims.prevClaimQuantity || 0;
                                    var previousClaimPercentage = prevClaims.previousClaimPercentage || 0;
                                    var certifiedClaimPercentage = prevClaims.certifiedClaimPercentage || 0;
                                    var certifiedAmount = prevClaims.certifiedAmount || 0.00;
                                    var claimRemarks = prevClaims.claimRemarks || '';

                                    var currentClaim = prevClaims.currentClaim || 0.00;
                                    var currentCertifiedClaim = prevClaims.currentCertifiedClaim || 0.00;
                                    var currentClaimPercentage = prevClaims.currentClaimPercentage || 0;
                                    var currentClaimQuantity = prevClaims.currentClaimQuantity || 0;
                                    var claimInvoice = prevClaims.claimInvoice || null;

                                    {
                                        variationOrderSublist.setSublistValue({
                                            id: 'orders_check1',
                                            line: addedLines,
                                            value: 'F'
                                        });
                                        variationOrderSublist.setSublistValue({
                                            id: 'claim_id1',
                                            line: addedLines,
                                            value: claimId
                                        });
                                        variationOrderSublist.setSublistValue({
                                            id: 'desc1',
                                            line: addedLines,
                                            value: Desc
                                        });

                                        variationOrderSublist.setSublistValue({
                                            id: 'is_variation_line1',
                                            line: addedLines,
                                            value: isVariationLine == true ? 'T' : 'F'
                                        });

                                        variationOrderSublist.setSublistValue({
                                            id: 'unit1',
                                            line: addedLines,
                                            value: unit
                                        });
                                        if (salesOrder) {
                                            variationOrderSublist.setSublistValue({
                                                id: 'boq_sales_order1',
                                                line: addedLines,
                                                value: salesOrder
                                            });
                                        }
                                        if(claimInvoice) {
                                            variationOrderSublist.setSublistValue({
                                                id: 'claim_invoice1',
                                                line: addedLines,
                                                value: claimInvoice
                                            });
                                        }
                                        variationOrderSublist.setSublistValue({
                                            id: 'boq_quantity1',
                                            line: addedLines,
                                            value: boqQty || 0
                                        });
                                        contract_total_qty1 = parseFloat(contract_total_qty1) + parseFloat(boqQty);

                                        variationOrderSublist.setSublistValue({
                                            id: 'rate1',
                                            line: addedLines,
                                            value: rate || 0
                                        });

                                        variationOrderSublist.setSublistValue({
                                            id: 'this_month_amount1',
                                            line: addedLines,
                                            value: currentClaim
                                        });
                                        totalThisMonthAmountVariationHeader += currentClaim;

                                        const variationLineCumulativeQty = parseFloat(prevClaimQuantity) + parseFloat(currentClaimQuantity);
                                        variationOrderSublist.setSublistValue({
                                            id: 'cumulative_qty1',
                                            line: addedLines,
                                            value: variationLineCumulativeQty
                                        });

                                        const variationLineCumulativePercentage = (parseFloat(previousClaimPercentage) + parseFloat(currentClaimPercentage)).toFixed(2);
                                        variationOrderSublist.setSublistValue({
                                            id: 'cumulative_perc1',
                                            line: addedLines,
                                            value: variationLineCumulativePercentage
                                        });

                                        const variationLineCumulativeTotal = (parseFloat(prevClaimAmount) + parseFloat(currentClaim)).toFixed(2);
                                        variationOrderSublist.setSublistValue({
                                            id: 'cumulative_total1',
                                            line: addedLines,
                                            value: variationLineCumulativeTotal
                                        });
                                        variationOrderSublist.setSublistValue({
                                            id: 'total_claim_amount1',
                                            line: addedLines,
                                            value: prevClaimAmount
                                        });
                                        contract_total_claim_amount1 = parseFloat(contract_total_claim_amount1) + parseFloat(prevClaimAmount);

                                        variationOrderSublist.setSublistValue({
                                            id: 'claimable_amount1',
                                            line: addedLines,
                                            value: claimableAmount
                                        });
                                        totalClaimableAmount = totalClaimableAmount + parseFloat(claimableAmount);
                                        contract_total_amount1 = contract_total_amount1 + parseFloat(claimableAmount);

                                        variationOrderSublist.setSublistValue({
                                            id: 'prev_claim_qty1',
                                            line: addedLines,
                                            value: prevClaimQuantity
                                        });
                                        contract_total_prev_qty1 = contract_total_prev_qty1 + parseFloat(prevClaimQuantity);

                                        variationOrderSublist.setSublistValue({
                                            id: 'prev_claim_percentage1',
                                            line: addedLines,
                                            value: previousClaimPercentage
                                        });
                                        variationOrderSublist.setSublistValue({
                                            id: 'prev_claim1',
                                            line: addedLines,
                                            value: prevClaimAmount
                                        });
                                        totalClaimAmount = totalClaimAmount + parseFloat(prevClaimAmount);
                                        variationOrderSublist.setSublistValue({
                                            id: 'prev_claim_certified1',
                                            line: addedLines,
                                            value: certifiedAmount
                                        });
                                        totalCertifiedAmount = totalCertifiedAmount + parseFloat(certifiedAmount);
                                        contract_total_prev_amount1 = contract_total_prev_amount1 + parseFloat(prevClaimAmount);

                                        variationOrderSublist.setSublistValue({
                                            id: 'outstanding_claims1',
                                            line: addedLines,
                                            value: parseFloat(claimableAmount) - parseFloat(certifiedAmount)
                                        });
                                        variationOrderSublist.setSublistValue({
                                            id: 'current_claim1',
                                            line: addedLines,
                                            value: currentClaim
                                        });
                                        variationOrderSublist.setSublistValue({
                                            id: 'certified_claim1',
                                            line: addedLines,
                                            value: currentCertifiedClaim
                                        });
                                        totalCurrentMonthCumulativeCertifiedAmount += parseFloat(currentCertifiedClaim);
                                        variationOrderSublist.setSublistValue({
                                            id: 'difference1',
                                            line: addedLines,
                                            value: 0
                                        });
                                        variationOrderSublist.setSublistValue({
                                            id: 'remarks1',
                                            line: addedLines,
                                            value: claimRemarks || '-'
                                        });
                                        if (certifiedClaimPercentage) {
                                            variationOrderSublist.setSublistValue({
                                                id: 'certified_claim_percentage1',
                                                line: addedLines,
                                                value: certifiedClaimPercentage
                                            });
                                        }
                                        variationOrderSublist.setSublistValue({
                                            id: 'quantity_editable1',
                                            line: addedLines,
                                            value: currentClaimQuantity
                                        });
                                        totalThisMonthQuantityVariationHeader += currentClaimQuantity;
                                        variationOrderSublist.setSublistValue({
                                            id: 'perc_editable1',
                                            line: addedLines,
                                            value: currentClaimPercentage
                                        });

                                        addedLines++;
                                    }
                                    s++;
                                }
                            }
                            //set total values
                            projectTotals.fieldTotalQty1 = contract_total_qty1;
                            projectTotals.fieldTotalAmount1 = contract_total_amount1.toFixed(2);
                            projectTotals.fieldTotalPrevQty1 = contract_total_prev_qty1;
                            projectTotals.fieldTotalPrevAmount1 = contract_total_prev_amount1.toFixed(2);
                            projectTotals.fieldTotalThisMonthQty1 = totalThisMonthQuantityVariationHeader;
                            projectTotals.fieldTotalThisMonthAmount1 = parseFloat(totalThisMonthAmountVariationHeader).toFixed(2);
                            projectTotals.fieldTotalCumQty1 = projectTotals.fieldTotalPrevQty1 + projectTotals.fieldTotalThisMonthQty1;
                            projectTotals.fieldTotalCumAmount1 = (parseFloat(projectTotals.fieldTotalPrevAmount1) + parseFloat(projectTotals.fieldTotalThisMonthAmount1)).toFixed(2);
                        }
                        //set total values
                        projectTotals.fieldTotalAmount2 = parseFloat(contract_total_amount) + parseFloat(contract_total_amount1);
                        projectTotals.fieldTotalPrevAmount2 = parseFloat(contract_total_prev_amount) + parseFloat(contract_total_prev_amount1);
                        projectTotals.fieldTotalThisMonthAmount2 = parseFloat(totalThisMonthAmountHeader) + parseFloat(totalThisMonthAmountVariationHeader);
                        projectTotals.fieldTotalCumAmount2 = parseFloat(projectTotals.fieldTotalCumAmount) + parseFloat(projectTotals.fieldTotalCumAmount1);
                        projectTotals.fieldCurrentMonthCumCerAmount = parseFloat(totalCurrentMonthCumulativeCertifiedAmount).toFixed(2);
                        let calculatedCurrentMonthRetention = parseFloat(totalCurrentMonthCumulativeCertifiedAmount * parseFloat(retentionPercentage) / 100) || 0.00;
                        if(calculatedCurrentMonthRetention + retentionAmount > maxRetentionAmount) {
                            projectTotals.fieldCurrentMonthRetention = maxRetentionAmount - retentionAmount;
                        } else {
                            projectTotals.fieldCurrentMonthRetention = calculatedCurrentMonthRetention;
                        }
                        if(projectTotals.fieldCurrentMonthRetention > 0) {
                            projectTotals.fieldTobeInvoiced = parseFloat(projectTotals.fieldCurrentMonthCumCerAmount) - parseFloat(projectTotals.fieldCurrentMonthRetention);
                        }else {
                            projectTotals.fieldTobeInvoiced = 0.00;
                        }
                    }

                    if(currentClaimDate != null) {
                        //moment.utc(selectedClaimDate, 'DD/MM/YYYY').toDate()
                        fieldStartDate.defaultValue = currentClaimDate;
                    } else {
                        fieldStartDate.defaultValue = new Date();
                    }
                } else {
                    var success_msg = form.addField({
                        id: 'user_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Error, please pass ProjectId'
                    });
                    success_msg.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });
                }

                fieldTotalQty.defaultValue = projectTotals.fieldTotalQty;
                fieldTotalAmount.defaultValue = parseFloat(projectTotals.fieldTotalAmount).toFixed(2);
                fieldTotalPrevQty.defaultValue = projectTotals.fieldTotalPrevQty;
                fieldTotalPrevAmount.defaultValue = parseFloat(projectTotals.fieldTotalPrevAmount).toFixed(2);
                fieldTotalThisMonthQty.defaultValue = projectTotals.fieldTotalThisMonthQty;
                fieldTotalThisMonthAmount.defaultValue = parseFloat(projectTotals.fieldTotalThisMonthAmount).toFixed(2);
                fieldTotalCumQty.defaultValue = projectTotals.fieldTotalCumQty;
                fieldTotalCumAmount.defaultValue = parseFloat(projectTotals.fieldTotalCumAmount).toFixed(2);

                fieldTotalQty1.defaultValue = projectTotals.fieldTotalQty1;
                fieldTotalAmount1.defaultValue = parseFloat(projectTotals.fieldTotalAmount1).toFixed(2);
                fieldTotalPrevQty1.defaultValue = projectTotals.fieldTotalPrevQty1;
                fieldTotalPrevAmount1.defaultValue = parseFloat(projectTotals.fieldTotalPrevAmount1).toFixed(2);
                fieldTotalThisMonthQty1.defaultValue = projectTotals.fieldTotalThisMonthQty1;
                fieldTotalThisMonthAmount1.defaultValue = parseFloat(projectTotals.fieldTotalThisMonthAmount1).toFixed(2);
                fieldTotalCumQty1.defaultValue = projectTotals.fieldTotalCumQty1;
                fieldTotalCumAmount1.defaultValue = parseFloat(projectTotals.fieldTotalCumAmount1).toFixed(2);

                fieldTotalAmount2.defaultValue = parseFloat(projectTotals.fieldTotalAmount2).toFixed(2);
                fieldTotalPrevAmount2.defaultValue = parseFloat(projectTotals.fieldTotalPrevAmount2).toFixed(2);
                fieldTotalThisMonthAmount2.defaultValue = parseFloat(projectTotals.fieldTotalThisMonthAmount2).toFixed(2);
                fieldTotalCumAmount2.defaultValue = parseFloat(projectTotals.fieldTotalCumAmount2).toFixed(2);
                fieldCurrentMonthCumCerAmount.defaultValue = projectTotals.fieldCurrentMonthCumCerAmount;
                currentMonthRetentionField.defaultValue = projectTotals.fieldCurrentMonthRetention;
                fieldTobeInvoiced.defaultValue = projectTotals.fieldTobeInvoiced;
            }

            context.response.writePage(form);
        }

        function getLinePreviousAndCurrentClaimValues(allPreviousProjectClaims, claimDescription, isVariationLine, selectedClaimNo) {
            const claimsObj = {
                prevClaimAmount: 0,
                certifiedAmount: 0,
                currentClaim: 0,
                currentCertifiedClaim: 0,
                currentClaimQuantity: 0,
                currentClaimPercentage: 0,
                certifiedClaimPercentage: null,
                claimId: null,
                claimInvoice: null,
                prevClaimQuantity: 0,
                previousClaimPercentage: 0,
                claimRemarks: ''
            };
            if(selectedClaimNo !== 'create_new') { selectedClaimNo = parseInt(selectedClaimNo); }
            for(let i = 0; i < allPreviousProjectClaims.length; i++) {
                const claim = allPreviousProjectClaims[i];
                const claimDesc = claim.claimDescription;
                const isVariation = claim.isVariationLine;
                if (claimDesc.replace(/\s/g, '') == claimDescription.replace(/\s/g, '') && isVariation == isVariationLine) {
                    let searchResultClaimNumber = parseInt(claim.claimNo);
                    if (searchResultClaimNumber == selectedClaimNo) {
                        claimsObj.claimId = claim.claimId;
                        claimsObj.claimInvoice = claim.claimInvoice;
                        currentClaimDate = claim.claimDate;
                        claimsObj.currentClaim = parseFloat(claim.claimAmount).toFixed(2);
                        claimsObj.currentCertifiedClaim = parseFloat(claim.certifiedAmount).toFixed(2);
                        claimsObj.certifiedClaimPercentage = parseFloat(claim.certifiedClaimPercentage).toFixed(2);
                        claimsObj.currentClaimPercentage = parseFloat(claim.claimPercentage).toFixed(2);
                        claimsObj.currentClaimQuantity = parseFloat(claim.claimQuantity);
                        claimsObj.claimRemarks = claim.claimRemarks;
                    } else if ((searchResultClaimNumber < selectedClaimNo) || selectedClaimNo == 'create_new') {
                        claimsObj.prevClaimQuantity += parseFloat(claim.claimQuantity);
                        claimsObj.prevClaimAmount = (parseFloat(claimsObj.prevClaimAmount) + parseFloat(claim.claimAmount)).toFixed(2);
                        claimsObj.previousClaimPercentage = (parseFloat(claimsObj.previousClaimPercentage) + parseFloat(claim.claimPercentage)).toFixed(2);
                        claimsObj.certifiedAmount = (parseFloat(claimsObj.certifiedAmount) + parseFloat(claim.certifiedAmount)).toFixed(2);
                    } 
                }
            }
            
            return claimsObj;
        }

        function fetchAllPreviousProjectClaims(projectId) {
            const allClaims = [];
            var customrecord_ps_boq_project_claimsSearchObj = search.create({
                type: "customrecord_ps_boq_project_claims",
                filters: [
                    ["custrecord_ps_boq_claims_project", "anyof", projectId],
                ],
                columns: [
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_description",
                        label: "Claim Description"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_amount",
                        label: "Claim Amount"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_certifiedamount",
                        label: "Certified Claim Amount"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_date",
                        label: "Claim Date"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_variation",
                        label: "Variation Line"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_certifiedclaimp",
                        label: "Certified Claim "
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_quantity",
                        label: "Certified Claim Quantity"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_perc",
                        label: "Certified Claim %"
                    }),
                    search.createColumn({
                        name: "custrecord_claim_remarks",
                        label: "Certified Claim Remarks"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_claimno",
                        label: "Claim No"
                    }),
                    search.createColumn({
                        name: "custrecord_ps_boq_claims_invoice",
                        label: "Claim Invoice"
                    })
                ]
            });

            customrecord_ps_boq_project_claimsSearchObj.run().each(function(result) {
                allClaims.push({
                    claimId: result.id,
                    claimDescription: result.getValue(result.columns[0]),
                    claimAmount: result.getValue(result.columns[1]),
                    certifiedAmount: result.getValue(result.columns[2]),
                    claimDate: result.getValue(result.columns[3]),
                    isVariationLine: result.getValue(result.columns[4]),
                    certifiedClaimPercentage: result.getValue(result.columns[5]),
                    claimQuantity: result.getValue(result.columns[6]),
                    claimPercentage: result.getValue(result.columns[7]),
                    claimRemarks: result.getValue(result.columns[8]),
                    claimNo: result.getValue(result.columns[9]),
                    claimInvoice: result.getValue(result.columns[10])
                });
                return true;
            });

            return allClaims;
        }

        function getRetentionAmount(projectId, maxRetentionAmount) {
            var retentionAmount = 0;
            var searchData = search.load({
                id: 'customsearch_ps_boq_retention'
            });

            if (projectId) {
                var projectIdFilter = search.createFilter({
                    name: "internalid",
                    join: "customer",
                    operator: search.Operator.ANYOF,
                    values: [projectId]
                });
                searchData.filters.push(projectIdFilter);
            }
            var searchDataResult = searchData.run().getRange(0, 1) || [];
            if (searchDataResult.length > 0) {
                retentionAmount = searchDataResult[0].getValue({
                    name: 'amount',
                    summary: search.Summary.SUM,
                });
            }
            let parsedRetentionAmount = Math.abs(parseFloat(retentionAmount));
            const parsedMaxRetentionAmount = parseFloat(maxRetentionAmount);

            if (parsedRetentionAmount > parsedMaxRetentionAmount && parsedMaxRetentionAmount > 0) {
                parsedRetentionAmount = parsedMaxRetentionAmount;
            }
            return parsedRetentionAmount;
        }

        return {
            onRequest: onRequest
        };
});
