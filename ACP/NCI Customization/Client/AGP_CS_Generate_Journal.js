/**
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 */
define(['N/record', 'N/search'], function (record, search) {

    function pageInit(context) {
        try {
            console.log('pageInit fired');
        } catch (e) {
            console.log('pageInit Error: ' + e.message);
        }
    }
function generateJournal(recid) {
    var title = 'generateJournal';
    try {
        var nciCalculationLoadObj = nciCalculationSearch(recid);
        var lastPeriodDate = parseLastPeriodDate(nciCalculationLoadObj.lastPeriodDate);

        var nciRec = record.load({
            type: 'customrecord_psg_ncicalculation',
            id: recid
        });
        var netIncomeStr = nciRec.getValue('custrecord_psg_nci_ni');
        var netIncomeNum = 0;
        if (netIncomeStr) {
            netIncomeNum = parseFloat(netIncomeStr.replace(/[()]/g, ""));
        }

        var nciAmount = parseFloat(nciCalculationLoadObj.amount) || 0;
        if (nciAmount === 0) {
            alert("Net Income is " + netIncomeStr + " → Journal Entry not created.");
            return;
        }

        var parentSubsidiary = nciRec.getValue('custrecord_psg_nci_parent');
        var elimSubsidiary = nciRec.getValue('custrecord_psg_nci_elimsub');
        var finalSubsidiary = elimSubsidiary || parentSubsidiary || nciCalculationLoadObj.subsidiary;

        var journalEntryObj = record.create({ type: record.Type.JOURNAL_ENTRY });
        journalEntryObj.setValue({ fieldId: 'subsidiary', value: parseInt(finalSubsidiary) });
        journalEntryObj.setValue({ fieldId: 'postingperiod', value: parseInt(nciCalculationLoadObj.lastPeriod) });
        journalEntryObj.setValue({ fieldId: 'trandate', value: lastPeriodDate });
        journalEntryObj.setValue({
            fieldId: 'memo',
            value: nciCalculationLoadObj.subsidiaryText + ' NCI Allocation ' + nciCalculationLoadObj.lastPeriodText
        });
        
        if (netIncomeStr && netIncomeStr.includes("(")) {
            //console.log("Negative Net Income → Swapped: Debit Account gets Credit, Credit Account gets Debit");

            // Line 1: Credit Account → DEBIT amount (swapped)
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 0, value: parseInt(nciCalculationLoadObj.credit) });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 0, value: nciAmount });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'memo', line: 0, value: nciCalculationLoadObj.subsidiaryText + ' NCI Allocation ' + nciCalculationLoadObj.lastPeriodText });


            // Line 0: Debit Account → CREDIT amount (swapped)
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 1, value: parseInt(nciCalculationLoadObj.debit) });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 1, value: nciAmount });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'memo', line: 1, value: nciCalculationLoadObj.subsidiaryText + ' NCI Allocation ' + nciCalculationLoadObj.lastPeriodText });

            


        } else {
            //console.log("Positive Net Income → Normal: Debit Account gets Debit, Credit Account gets Credit");

            // Line 0: Debit Account → DEBIT amount (normal)
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 0, value: parseInt(nciCalculationLoadObj.debit) });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 0, value: nciAmount });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'memo', line: 0, value: nciCalculationLoadObj.subsidiaryText + ' NCI Allocation ' + nciCalculationLoadObj.lastPeriodText });

            // Line 1: Credit Account → CREDIT amount (normal)
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 1, value: parseInt(nciCalculationLoadObj.credit) });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 1, value: nciAmount });
            journalEntryObj.setSublistValue({ sublistId: 'line', fieldId: 'memo', line: 1, value: nciCalculationLoadObj.subsidiaryText + ' NCI Allocation ' + nciCalculationLoadObj.lastPeriodText });
        }

        // Save Journal
        var jeId = journalEntryObj.save();
        //console.log('Generated Journal Entry ID = ' + jeId);

        if (jeId) {
            nciRec.setValue({ fieldId: 'custrecord_psg_nci_journal_link', value: jeId });
            nciRec.save();
            //console.log('Linked JE back to NCI record successfully');
        }

        window.location.reload();
    } catch (e) {
        console.log(title + ' Error: ' + e.message);
    }
}
  
// All Fields are Updating with Re-process Button 
  
function reprocessCalculation(recid) {
    var title = 'reprocessCalculation';
    try {
        //console.log(title + ' started for recid = ' + recid);

        var nciRec = record.load({
            type: 'customrecord_psg_ncicalculation',
            id: recid
        });

        var oldSubsidiary = nciRec.getValue('custrecord_psg_nci_so_sub');
        var oldDebit = nciRec.getValue('custrecord_psg_nci_dracct');
        var oldCredit = nciRec.getValue('custrecord_psg_nci_cracct');
        var oldAmount = parseFloat(nciRec.getValue('custrecord_psg_nci_amt') || 0);
        var oldPeriod = nciRec.getValue('custrecord_psg_nci_period');
        var oldNetIncomeStr = nciRec.getValue('custrecord_psg_nci_ni') || "0";
        var oldNetIncome = parseFloat(oldNetIncomeStr.replace(/[()]/g, ""));
        var oldCurrency = nciRec.getValue('custrecord_psg_nci_ccy');
        var oldParent = nciRec.getValue('custrecord_psg_nci_parent');
        var oldElim = nciRec.getValue('custrecord_psg_nci_elimsub');
        var ownership = parseFloat(nciRec.getValue('custrecord_psg_nci_ownership') || 0);
        var soId = nciRec.getValue('custrecord_psg_nci_so');

        // console.log("Old Values → Sub=" + oldSubsidiary + ", Dr=" + oldDebit + ", Cr=" + oldCredit +
        //     ", Amt=" + oldAmount + ", Period=" + oldPeriod + ", NetInc=" + oldNetIncomeStr +
        //     ", Ccy=" + oldCurrency + ", Parent=" + oldParent + ", Elim=" + oldElim);

        var netIncomeObj = netIncomeSearch(oldSubsidiary);
        // var newNetIncome = parseFloat(netIncomeObj.netIncome || 0);
        var newNetIncome = netIncomeObj || 0;
        var newAmount = parseFloat(calculateNciAmount(ownership, Math.abs(newNetIncome)));

        console.log("Saved Search → NetIncome=" + newNetIncome + ", NCI Amount=" + newAmount);

        var newSubsidiary = oldSubsidiary, newDebit = oldDebit, newCredit = oldCredit,
            newCurrency = oldCurrency, newParent = oldParent, newElim = oldElim;

        if (soId) {
            var soRec = record.load({
                type: 'customrecord_psg_subownership',
                id: soId
            });
            newSubsidiary = soRec.getValue('custrecord_psg_subown_sub');
            newDebit = soRec.getValue('custrecord_psg_subown_dracct');
            newCredit = soRec.getValue('custrecord_psg_subown_cracct');
            newCurrency = soRec.getValue('custrecord_psg_soccy');
            newParent = soRec.getValue('custrecord_psg_subown_parent');
            newElim = soRec.getValue('custrecord_psg_subown_elimsub');
        }

        // console.log("Subsidiary Ownership → Sub=" + newSubsidiary + ", Dr=" + newDebit +
        //     ", Cr=" + newCredit + ", Ccy=" + newCurrency + ", Parent=" + newParent + ", Elim=" + newElim);

        var hasChanges = false;
        var newNetIncomeStr = "";

        if (oldSubsidiary != newSubsidiary) {
            console.log("Subsidiary changed → " + oldSubsidiary + " → " + newSubsidiary);
            nciRec.setValue('custrecord_psg_nci_so_sub', newSubsidiary);
            hasChanges = true;
        }
        if (oldDebit != newDebit) {
            //console.log("Debit Account changed → " + oldDebit + " → " + newDebit);
            nciRec.setValue('custrecord_psg_nci_dracct', newDebit);
            hasChanges = true;
        }
        if (oldCredit != newCredit) {
            //console.log("Credit Account changed → " + oldCredit + " → " + newCredit);
            nciRec.setValue('custrecord_psg_nci_cracct', newCredit);
            hasChanges = true;
        }
        if (oldCurrency != newCurrency) {
            //console.log("Currency changed → " + oldCurrency + " → " + newCurrency);
            nciRec.setValue('custrecord_psg_nci_ccy', newCurrency);
            hasChanges = true;
        }
        if (oldParent != newParent) {
            //console.log("Parent changed → " + oldParent + " → " + newParent);
            nciRec.setValue('custrecord_psg_nci_parent', newParent);
            hasChanges = true;
        }
        if (oldElim != newElim) {
            //console.log("Elimination Sub changed → " + oldElim + " → " + newElim);
            nciRec.setValue('custrecord_psg_nci_elimsub', newElim);
            hasChanges = true;
        }
        if (oldNetIncome != newNetIncome) {
            console.log("Net Income changed == → " + oldNetIncome + " → " + newNetIncome);
          
            // newNetIncomeStr = (newNetIncome < 0) ? "(" + Math.abs(newNetIncome).toFixed(2) + ")" : newNetIncome.toFixed(2);
            newNetIncomeStr = (newNetIncome < 0) ? Math.abs(newNetIncome).toFixed(2) : '(' + newNetIncome.toFixed(2) + ')';
          console.log("newNetIncomeStr == AR → " + newNetIncomeStr);
            nciRec.setValue('custrecord_psg_nci_ni', newNetIncomeStr);
            hasChanges = true;
        }
        if (oldAmount != newAmount) {
            //console.log("Amount changed → " + oldAmount + " → " + newAmount);
            nciRec.setValue('custrecord_psg_nci_amt', newAmount);
            hasChanges = true;
        }

        if (hasChanges) {
            nciRec.save();
            //console.log("NCI record updated successfully.");

            var jeId = nciRec.getValue('custrecord_psg_nci_journal_link');
            if (jeId) {
                //console.log("Updating linked JE=" + jeId);

                var jeRec = record.load({
                    type: record.Type.JOURNAL_ENTRY,
                    id: jeId
                });

                var netIncomeForJE = newNetIncomeStr || nciRec.getValue('custrecord_psg_nci_ni');
                
                if (netIncomeForJE && netIncomeForJE.includes("(")) {
                    //console.log("Negative Net Income → Swapped: Debit Account gets Credit, Credit Account gets Debit");
                    
                    // Line 0: Debit Account → CREDIT amount
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 0, value: parseInt(newDebit) });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 0, value: newAmount });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 0, value: 0 }); // Clear debit
                    
                    // Line 1: Credit Account → DEBIT amount
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 1, value: parseInt(newCredit) });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 1, value: newAmount });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 1, value: 0 }); // Clear credit
                    
                } else {
                    //console.log("Positive Net Income → Normal: Debit Account gets Debit, Credit Account gets Credit");
                    
                    // Line 0: Debit Account → DEBIT amount
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 0, value: parseInt(newDebit) });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 0, value: newAmount });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 0, value: 0 }); // Clear credit
                    
                    // Line 1: Credit Account → CREDIT amount
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'account', line: 1, value: parseInt(newCredit) });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: 1, value: newAmount });
                    jeRec.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: 1, value: 0 }); // Clear debit
                }

                jeRec.save();
                //console.log("Journal Entry updated successfully.");
            }
        } else {
            console.log("No change detected → Skipping update.");
        }

        window.location.reload();

    } catch (e) {
        console.log(title + " Error: " + e.message);
    }
}
  function nciCalculationSearch(recid) {
    var obj = {};
    try {
        var searchObj = search.create({
            type: "customrecord_psg_ncicalculation",
            filters: [["internalid", "anyof", recid]],
            columns: [
                search.createColumn({ name: "custrecord_psg_nci_so_sub" }),
                search.createColumn({ name: "custrecord_psg_nci_dracct" }),
                search.createColumn({ name: "custrecord_psg_nci_cracct" }),
                search.createColumn({ name: "custrecord_psg_nci_amt" }),
                search.createColumn({ name: "custrecord_psg_nci_period" }),
                search.createColumn({ name: "custrecord_psg_nci_parent" }),   
                search.createColumn({ name: "custrecord_psg_nci_elimsub" }),
                search.createColumn({
                    name: "enddate",
                    join: "custrecord_psg_nci_period"
                }),
                search.createColumn({
                    name: "formulatext",
                    formula: "SUBSTR({custrecord_psg_nci_so_sub}, INSTR({custrecord_psg_nci_so_sub}, ':', -1) + 1)",
                    label: "Subsidiary Text"
                })
            ]
        });

        searchObj.run().each(function (result) {
            obj.subsidiary = result.getValue({ name: 'custrecord_psg_nci_so_sub' });
            obj.subsidiaryText = result.getValue({ name: 'formulatext' });
            obj.debit = result.getValue({ name: 'custrecord_psg_nci_dracct' });
            obj.credit = result.getValue({ name: 'custrecord_psg_nci_cracct' });
            obj.amount = result.getValue({ name: 'custrecord_psg_nci_amt' });
            obj.lastPeriod = result.getValue({ name: 'custrecord_psg_nci_period' });
            obj.lastPeriodText = result.getText({ name: 'custrecord_psg_nci_period' });
            obj.lastPeriodDate = result.getValue({
                name: 'enddate',
                join: 'custrecord_psg_nci_period'
            });
            obj.parentSubsidiary = result.getValue({ name: 'custrecord_psg_nci_parent' });
            obj.elimSubsidiary = result.getValue({ name: 'custrecord_psg_nci_elimsub' });

           // console.log("Subsidiary Text (formula result) = " + obj.subsidiaryText);
           // console.log("Subsidiary Amount = " + obj.amount);

          
            return false;
        });
    } catch (e) {
        console.log('nciCalculationSearch Error: ' + e.message);
    }
    return obj || {};
}

  function parseLastPeriodDate(dateString) {
    if (!dateString) return new Date();

    var parts = dateString.split('/');
    if (parts.length !== 3) return new Date(dateString);

    var day, month, year;

    if (parseInt(parts[0], 10) > 12) {
        // Format: DD/MM/YYYY
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
    } else {
        // Format: MM/DD/YYYY
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
    }

    return new Date(year, month, day);
}

    function calculateNciAmount(ownership, netIncome) {
        var number = parseFloat(ownership);
        var decimalNumber = number / 100;
        var nciAmount = parseFloat((1 - decimalNumber) * netIncome);
        return nciAmount.toFixed(2);
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
            transactionSearchObj.run().each(function (result) {
                netIncome += parseFloat(result.getValue({ name: "formulacurrency", summary: "SUM" , formula: "case when {accounttype} = 'Income' then -{amount} when {accounttype} = 'Other Income' then -{amount} else {amount} end"})) || 0;
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

    return {
        pageInit: pageInit,
        generateJournal: generateJournal,
        reprocessCalculation: reprocessCalculation
    };
});
