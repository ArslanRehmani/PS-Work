/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/format', 'N/task'], /**
 * @param{record} record
 * @param{search} search
 * @param{runtime} runtime
 * @param{task} task
 */ (record, search, runtime, format, task) => {
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = (scriptContext) => {
        log.audit('Start Usage', runtime.getCurrentScript().getRemainingUsage());

        const pySearch = search
            .load({
                id: 'customsearch_ps_vendor_payment_status',
            })
            .run()
            .getRange({
                start: 0,
                end: 20,
            });
        if (pySearch.length < 1) return;

        pySearch.forEach((q) => {
            log.audit('Each start Usage', runtime.getCurrentScript().getRemainingUsage());

            try {
                var pyId = q.getValue('internalid');
                log.debug('pyId', pyId);
                var pyApprovalStatus = q.getValue('approvalstatus');
                var pyStatus = q.getValue('statusref');
                var pyStatusMatch = q.getValue('custbody_ps_acme_match_status');
                if (!pyStatusMatch || pyStatusMatch == '') {
                    log.debug('pyApprovalStatus', pyApprovalStatus);
                    log.debug('pyStatus', pyStatus);
                    if (pyApprovalStatus == 2 && pyStatus == 'approved') {
                        //do matching to Bank Authorization
                        var doMatching = __doMatchingPayment(pyId);
                        var filterBankStatusSuccess = doMatching.filter((o) => o.nsPayment === pyId);
                        if (filterBankStatusSuccess.length > 0) {
                            //if status match found more than 1 rows. get the last status
                            var lastStatus = filterBankStatusSuccess[filterBankStatusSuccess.length - 1];
                            var lastStatusResponse = lastStatus.bankResponseStatus;
                            if (lastStatusResponse) {
                                const recVPay = record.load({
                                    type: record.Type.VENDOR_PAYMENT,
                                    id: pyId,
                                });
                                const approvalStatus = recVPay.getValue({ fieldId: 'approvalstatus' });
                                const vpStatus = recVPay.getValue({ fieldId: 'status' });
                                if (approvalStatus == '2' && vpStatus == 'Approved') {
                                    recVPay.setValue('custbody_ps_acme_match_status', lastStatusResponse);
                                    recVPay.save({
                                        // enableSourcing: true,
                                        ignoreMandatoryFields: true,
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                log.error('Error get data', e);
            }
        });
        log.audit('End Usage', runtime.getCurrentScript().getRemainingUsage());
    };

    const __doMatchingPayment = (pyId) => {
        var matchBankStatus = [];
        try {
            const queueSearch = search
                .create({
                    type: 'customrecord_ps_bank_validation_responce',
                    filters: [['custrecord_ps_bank_netsuite_payment', search.Operator.IS, pyId]],
                    columns: [
                        'internalid',
                        'custrecord_ps_bank_netsuite_payment',
                        'custrecord_ps_bank_payment_id',
                        'custrecord_ps_bank_responce_amount',
                        'custrecord_ps_bank_success_status',
                        'custrecord_bill_payment_amount',
                    ],
                })
                .run()
                .getRange({ start: 0, end: 10 });
            for (var i = 0; i < queueSearch.length; i++) {
                var dtSearch = queueSearch[i];
                var nsMatchId = dtSearch.getValue('internalid');
                var nsPayment = dtSearch.getValue('custrecord_ps_bank_netsuite_payment');
                var nsPaymentID = dtSearch.getValue('custrecord_ps_bank_payment_id');
                var nsPaymentAmount = dtSearch.getValue('custrecord_bill_payment_amount');
                var bankResponseAmount = dtSearch.getValue('custrecord_ps_bank_responce_amount');
                var bankResponseStatus = dtSearch.getText('custrecord_ps_bank_success_status');

                matchBankStatus.push({
                    nsMatchId: nsMatchId,
                    nsPayment: nsPayment,
                    nsPaymentID: nsPaymentID,
                    nsPaymentAmount: nsPaymentAmount,
                    bankResponseAmount: bankResponseAmount,
                    bankResponseStatus: bankResponseStatus,
                });
            }
        } catch (e) {
            log.error('Error __doMathingPayment', e);
        }
        return matchBankStatus;
    };

    return { execute };
});
