/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/log'], (search, record, log) => {

    const afterSubmit = (context) => {
        try {
            if (context.type !== context.UserEventType.CREATE) {
                return;
            }

            const newRecord = context.newRecord;
            const invoiceId = newRecord.id;
            const customerId = newRecord.getValue({ fieldId: 'entity' });
            const departmentId = newRecord.getValue({ fieldId: 'department' });
            const postingPeriodId = newRecord.getValue({ fieldId: 'postingperiod' });
            const autoApply = newRecord.getValue({ fieldId: 'custbody_ps_billing_autoapply_inv' });

            log.debug('Invoice Created', {
                invoiceId: invoiceId,
                customerId: customerId,
                departmentId: departmentId,
                postingPeriodId: postingPeriodId,
                autoApply: autoApply
            });

            if (autoApply == true) {
                const paymentSearch = search.load({
                    id: 'customsearch1042'
                });

                const filters = [];

                if (customerId) {
                    filters.push(search.createFilter({
                        name: 'entity',
                        operator: search.Operator.ANYOF,
                        values: [customerId]
                    }));
                }

                if (departmentId) {
                    filters.push(search.createFilter({
                        name: 'department',
                        operator: search.Operator.ANYOF,
                        values: [departmentId]
                    }));
                }

                paymentSearch.filters = paymentSearch.filters.concat(filters);

                const searchResults = paymentSearch.run().getRange({
                    start: 0,
                    end: 1
                });

                log.debug('Search Results Count', searchResults.length);

                searchResults.forEach((result) => {
                    const paymentId = result.id;

                    log.debug('Processing Payment', paymentId);

                    try {
                        const paymentRecord = record.load({
                            type: record.Type.CUSTOMER_PAYMENT,
                            id: paymentId,
                            isDynamic: true
                        });

                        const lineCount = paymentRecord.getLineCount({
                            sublistId: 'apply'
                        });

                        log.debug('Apply Line Count', lineCount);

                        for (let i = 0; i < lineCount; i++) {
                            const refNum = paymentRecord.getSublistValue({
                                sublistId: 'apply',
                                fieldId: 'refnum',
                                line: i
                            });

                            const applyDoc = paymentRecord.getSublistValue({
                                sublistId: 'apply',
                                fieldId: 'doc',
                                line: i
                            });

                            log.debug('Line ' + i, {
                                refNum: refNum,
                                docId: applyDoc
                            });

                            if (applyDoc == invoiceId) {
                                log.debug('Match Found', 'Applying payment to invoice at line ' + i);

                                paymentRecord.selectLine({
                                    sublistId: 'apply',
                                    line: i
                                });

                                paymentRecord.setCurrentSublistValue({
                                    sublistId: 'apply',
                                    fieldId: 'apply',
                                    value: true
                                });

                                paymentRecord.commitLine({
                                    sublistId: 'apply'
                                });

                                const savedPaymentId = paymentRecord.save();

                                log.audit('Payment Applied Successfully', {
                                    paymentId: savedPaymentId,
                                    invoiceId: invoiceId
                                });

                                break;
                            }
                        }

                    } catch (e) {
                        log.error('Error Processing Payment', {
                            paymentId: paymentId,
                            error: e.message
                        });
                    }
                });

            }

        } catch (e) {
            log.error('Error in afterSubmit', e.message);
        }
    };

    return {
        afterSubmit: afterSubmit
    };
});