/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 */
define(['N/log'], function (log) {

    function beforeLoad(context) {
        var title = 'beforeLoad[::]';
        try {
            var rec = context.newRecord;
            var recid = rec.id;
            
            var jeField = rec.getValue({ fieldId: 'custrecord_psg_nci_journal_link' });
            log.debug('beforeLoad :: Journal Entry Linked?', jeField);

            if (context.type == context.UserEventType.VIEW) {
                
                if (isEmpty(jeField)) {
                    addButton(context, recid, 'custpage_generatejournal', 'Generate JE', "generateJournal('" + recid + "')");
                }

                addButton(context, recid, 'custpage_reprocess', 'Re-process', "reprocessCalculation('" + recid + "')");
            }
        } catch (e) {
            log.error(title + e.name, e.message);
        }
    }
    
    function addButton(context, recid, id, label, functionName) {
        try {
            var form = context.form;
            form.clientScriptFileId = '161871';
            form.addButton({ 
                id: id, 
                label: label, 
                functionName: functionName
            });
            log.debug('addButton :: Button Added', { id: id, label: label });
        } catch (e) {
            log.error('addButton Error', e.message);
        }
    }
    
    function isEmpty(stValue) {
        try {
            return (stValue === '' || stValue == null || stValue == undefined || stValue.length == 0);
        } catch (e) {
            log.error('isEmpty Error', e.message);
            return true;
        }
    }
    
    return {
        beforeLoad: beforeLoad
    }
});
