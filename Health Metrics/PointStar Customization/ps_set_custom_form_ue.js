/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'], (record) => {
    const beforeLoad = (context) => {
        try {
            log.debug('context', context);
            if (context.type === context.UserEventType.CREATE &&
                 context.newRecord.type === 'advintercompanyjournalentry') {
                log.debug('context.newRecord', context.newRecord);
                context.newRecord.setValue({
                    fieldId: 'customform',
                    value: 111
                });
                log.debug('context.newRecord after', context.newRecord);
            }
        } catch (error) {
            log.error('Error in beforeLoad', error);
        }
    };

    return {
        beforeLoad
    };
});