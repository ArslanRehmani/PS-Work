/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log'], (record, search, runtime, log) => {
    function beforeSubmit(context) {

        try {
            if (context.type !== context.UserEventType.CREATE) return;
            const newRec = context.newRecord;
            const runDet = newRec.getValue('custrecord_ps_fam_run_det');
            const yearVal = newRec.getValue('custrecord_ps_fam_year');
            
            if (!runDet) return; 
            
            let hardcodedName;
            
            if (runDet == 1) {
                hardcodedName = 'CIP-SALES';
            } 
            else if (runDet == 2) {
                hardcodedName = 'CIP-SUPP';
            } 
            else if (runDet == 3 || runDet == 4) {


                /** Department Code Fetching Logic */

                const depId = newRec.getValue('custrecord_ps_fam_dep');
                if (!depId) return;
                
                let depText;
                try {
                    const departmentSearch = search.lookupFields({
                        type: search.Type.DEPARTMENT,
                        id: depId,
                        columns: ['name']
                    });
                    depText = departmentSearch.name;
                } catch (err) {
                    log.error('Error looking up department', err);
                    return;
                }
                
                if (!depText) return;
                
                const beforeHyphen = depText.split('-')[0].trim();
                const depCode = beforeHyphen.substring(0, 2);
                
                if (runDet == 3) {
                    hardcodedName = `${depCode}-110321`;
                } else {
                    const yearShort = yearVal ? yearVal.toString().slice(-2) : '00';
                    hardcodedName = `${depCode}-110801-${yearShort}`;
                }
            }
            else {
                return;
            }
            
            let incrementedNumber = 1;
          
            const searchObj = search.create({
              type: 'customrecord_ncfar_assettype',
              filters: [
                ['custrecord_ps_fam_run_det', 'is', runDet],
                'AND',
                ['custrecord_ps_fam_year', 'is', yearVal] 
                ],
              columns: [search.createColumn({ name: 'name', sort: search.Sort.DESC })]
            });
            
            
            const results = searchObj.run().getRange({ start: 0, end: 1 });
            if (results && results.length > 0) {
                const lastName = results[0].getValue('name');
                const match = lastName && lastName.match(/(\d{4})$/);
                if (match) {
                    incrementedNumber = parseInt(match[1]) + 1;
                }
            }
            
            const sequenceNumber = incrementedNumber.toString().padStart(4, '0');
            let recordName;
            
            if (runDet == 1 || runDet == 2) {
                recordName = `${hardcodedName}-${yearVal}-${sequenceNumber}`;
            } else if (runDet == 3 || runDet == 4) {
                recordName = `${hardcodedName}-${sequenceNumber}`;
            }
            
            newRec.setValue('name', recordName);
            
            log.audit('Auto Name Generated', `RunDet: ${runDet}, New Name: ${recordName}`);
            
        } catch (e) {
            log.error('Error in beforeSubmit', e);
        }
    }
    return { beforeSubmit };
});
