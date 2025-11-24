/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/runtime', 'N/log'], (record, runtime, log) => {
    const execute = (context) => {
        const script = runtime.getCurrentScript();
        const billingSheetId = script.getParameter({ name: 'custscript_ps_billing_sheet_id' });

        if (!billingSheetId) {
            log.error('Missing parameters', { billingSheetId });
            return;
        }

        let billingRecord = record.load({
            type: 'customrecord_ps_billing_sheet',
            id: billingSheetId,
        });

        if (billingRecord.getValue('custrecord_bs_processing_status') !== 'Pending') {
            return;
        }

        try {
            const sublistId = 'recmachcustrecord_bs_id';
            const lineCount = billingRecord.getLineCount({
                sublistId,
            });

            for (let i = 0; i < lineCount; i++) {
                const trandType = billingRecord.getSublistValue({
                    sublistId,
                    fieldId: 'custrecord_bsd_trantype',
                    line: i,
                });
                const trandId = billingRecord.getSublistValue({
                    sublistId,
                    fieldId: 'custrecord_bsd_tranid',
                    line: i,
                });

                let recType;
                if (trandType === 'Invoice') {
                    recType = record.Type.INVOICE;
                } else if (trandType === 'Credit Memo') {
                    recType = record.Type.CREDIT_MEMO;
                } else {
                    log.error('Unknown transaction type', trandType);
                    return;
                }

                record.submitFields({
                    type: recType,
                    id: trandId,
                    values: {
                        custbody_ps_billing_sheet_id: billingSheetId,
                    },
                });
            }

            billingRecord.setValue({
                fieldId: 'custrecord_bs_processing_status',
                value: 'Completed',
            });
            billingRecord.save();
        } catch (e) {
            billingRecord.setValue({
                fieldId: 'custrecord_bs_processing_status',
                value: 'Error',
            });
            billingRecord.setValue({
                fieldId: 'custrecord_bs_error_message',
                value: 'TST ' + e,
            });
            billingRecord.save();

            log.error('Fatal error in scheduled script', e);
        }
    };

    return { execute };
});
