/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/search'], (log, record, search) => {

    const beforeSubmit = (context) => {
        const newRecord = context.newRecord;
        const type = context.type;
        if (type !== context.UserEventType.CREATE && type !== context.UserEventType.EDIT) {
            return;
        }

        const subsidiary = newRecord.getValue('subsidiary');
        const department = newRecord.getValue('department');
        const currentHOD = newRecord.getValue('custbody_ps_hod');
        if(subsidiary && department && !currentHOD){
            const hod = getHOD(subsidiary, department);
            if(hod){
                newRecord.setValue('custbody_ps_hod', hod);
            }
        }
    };

    const getHOD = (subsidiary, department) => {
        let hod = null;
        const hodSearchObj = search.create({
            type: 'customrecord_ps_hodbydeptsubsi',
            filters: [
                ['custrecord_ps_subsidiary1', 'anyof', subsidiary],
                'AND',
                ['custrecord_ps_dept', 'anyof', department]
            ],
            columns: [
                search.createColumn({ name: 'custrecord_ps_hod', label: 'HOD' }),
                search.createColumn({ name: 'internalid', label: 'Internal ID' })
            ]
        });
        const hodSearchResult = hodSearchObj.run().getRange({ start: 0, end: 1 });
        if(hodSearchResult && hodSearchResult.length > 0){
            hod = hodSearchResult[0].getValue('custrecord_ps_hod');
        }
        return hod;
    };

    return {
        beforeSubmit
    };
});