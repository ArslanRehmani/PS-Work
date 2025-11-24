/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/log', 'N/search'], (log, search) => {

    const fieldChanged = (context) => {
        const currentRecord = context.currentRecord;
        const fieldId = context.fieldId;

        if (fieldId === 'subsidiary' || fieldId === 'department') {
            const subsidiary = currentRecord.getValue('subsidiary');
            const department = currentRecord.getValue('department');
            if (subsidiary && department) {
                const hod = getHOD(subsidiary, department);
                if (hod) {
                    currentRecord.setValue('custbody_ps_hod', hod);
                } else {
                    currentRecord.setValue('custbody_ps_hod', '');
                }
            } else {
                currentRecord.setValue('custbody_ps_hod', '');
            }
        }
    };

    const pageInit = (context) => {
        const currentRecord = context.currentRecord;
        const subsidiary = currentRecord.getValue('subsidiary');
        const department = currentRecord.getValue('department');
        if (subsidiary && department) {
            const hod = getHOD(subsidiary, department);
            if (hod) {
                currentRecord.setValue('custbody_ps_hod', hod);
            } else {
                currentRecord.setValue('custbody_ps_hod', '');
            }
        } else {
            currentRecord.setValue('custbody_ps_hod', '');
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
        if (hodSearchResult && hodSearchResult.length > 0) {
            hod = hodSearchResult[0].getValue('custrecord_ps_hod');
        }
        return hod;
    };

    return {
        pageInit,
        fieldChanged
    };
});