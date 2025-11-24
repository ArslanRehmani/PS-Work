/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/log'], (currentRecord, log) => {
    const pageInit = () => {
        try {
            const rec = currentRecord.get();
            log.debug('Record Type', rec.type);
            const customFormId = rec.getValue({ fieldId: 'customform' });
            if (rec.type === 'advintercompanyjournalentry' && customFormId != 111) {
                log.debug('Record before setting custom form', rec);
                rec.setValue({
                    fieldId: 'customform',
                    value: 111
                });
                log.debug('Record after setting custom form', rec);
            }
        } catch (error) {
            log.error('Error in pageInit', error);
        }
    };

    return {
        pageInit
    };
});