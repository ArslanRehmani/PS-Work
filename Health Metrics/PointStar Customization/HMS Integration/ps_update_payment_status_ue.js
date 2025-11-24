/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/record', 'N/log', 'N/search'], function (https, record, log, search) {
    /**
     * Function to be executed before the record is submitted.
     * @param {Object} context
     */
    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;
        log.debug('UpdatePaymentStatus User Event Triggered', { type: context.type });

        try {
            const rec = context.newRecord;
            const nsPaymentId = rec.id;
            log.debug('NetSuite Payment ID', { nsPaymentId: nsPaymentId });
            const status = determinePaymentStatus(context, rec);

            log.debug('Determined Payment Status', { status: status, nsPaymentId: nsPaymentId });
            if (status == 'Failed' || status == 'Rejected' || status == 'Voided' || status == 'Success') {
                const hmsIntegrationData = getHmsIntegrationDetails();
                log.debug('HMS Integration Details', { hmsIntegrationData: hmsIntegrationData });
                const accessToken = acquireAccessToken(hmsIntegrationData);
                log.debug('Acquired Access Token', { accessToken: accessToken });
                const payload = constructPayload(rec, status);
                log.debug('Constructed Payload', { payload: JSON.stringify(payload) });
                const apiResponse = sendApiRequest(hmsIntegrationData.devEndpoint, nsPaymentId, accessToken, payload);
                log.debug('API Response', { code: apiResponse.code, body: apiResponse.body });
                handleApiResponse(apiResponse, nsPaymentId, status);
            }
        } catch (e) {
            log.error('Error in UpdatePaymentStatus', { message: e.message, stack: e.stack });
            throw e; // Re-throw to ensure the record submission fails if critical
        }
    }

    /**
     * Determines the payment status based on record context.
     * @param {Object} context - User event context
     * @param {Object} rec - Record object
     * @returns {string} - Payment status (Processing, Success, Failed)
     */
    function determinePaymentStatus(context, rec) {
        const approvalStatus = rec.getValue({ fieldId: 'approvalstatus' });
        const vpStatus = rec.getValue({ fieldId: 'status' });
        const matchStatus = rec.getValue('custbody_ps_acme_match_status');
        log.debug('vpStatus', vpStatus);
        log.debug('matchStatus', matchStatus);

        if (context.type === context.UserEventType.CREATE || (context.type === context.UserEventType.EDIT && approvalStatus == '1')) {
            return 'Processing';
        } else if (context.type === context.UserEventType.EDIT) {
            log.debug('Approval Status', { approvalStatus: approvalStatus });
            if (approvalStatus == '2') {
                if (vpStatus == 'Approved' && matchStatus == 'Success') {
                    return 'Success';
                } else if (vpStatus == 'Voided') {
                    return 'Voided';
                }
            } else if (approvalStatus == '3') {
                //approvalstatus 3 = Rejected, then Payment status is Failed
                if (vpStatus == 'Rejected') {
                    return 'Rejected';
                } else {
                    return 'Failed';
                }
            }
        }
        log.debug('No status change detected', { approvalStatus: rec.getValue({ fieldId: 'approvalstatus' }) });
        return null;
    }

    /**
     * Retrieves HMS integration details from the custom record.
     * @returns {Object} - HMS integration data
     */
    function getHmsIntegrationDetails() {
        const hmsIntegrationSearch = search.create({
            type: 'customrecord_ps_hms_int_details',
            columns: [
                'custrecord_live_endpoint',
                'custrecord_dev_endpoint',
                'custrecord_tenant_id',
                'custrecord_client_id',
                'custrecord_client_secret',
                'custrecord_token_endpoint',
                'custrecord_api_scope',
            ],
        });

        let hmsIntegrationData = null;
        hmsIntegrationSearch.run().each(function (result) {
            hmsIntegrationData = {
                liveEndpoint: result.getValue('custrecord_live_endpoint'),
                devEndpoint: result.getValue('custrecord_dev_endpoint'),
                tenantId: result.getValue('custrecord_tenant_id'),
                clientId: result.getValue('custrecord_client_id'),
                clientSecret: result.getValue('custrecord_client_secret'),
                tokenEndpoint: result.getValue('custrecord_token_endpoint'),
                apiScope: result.getValue('custrecord_api_scope'),
            };
            return false;
        });

        if (!hmsIntegrationData) {
            log.error('HMS Integration Details Not Found', {});
            throw new Error('HMS integration details not configured');
        }

        return hmsIntegrationData;
    }

    /**
     * Acquires an access token using OAuth 2.0 Client Credentials flow.
     * @param {Object} hmsIntegrationData - HMS integration details
     * @returns {string} - Access token
     */
    function acquireAccessToken(hmsIntegrationData) {
        const tokenResponse = https.post({
            url: hmsIntegrationData.tokenEndpoint,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=client_credentials&client_id=${hmsIntegrationData.clientId}&client_secret=${hmsIntegrationData.clientSecret}&scope=${hmsIntegrationData.apiScope}`,
        });

        log.debug('Token Response', { code: tokenResponse.code, body: tokenResponse.body });

        if (tokenResponse.code !== 200) {
            log.error('Token Request Failed', { code: tokenResponse.code, body: tokenResponse.body });
            throw new Error('Failed to acquire token');
        }

        const tokenData = JSON.parse(tokenResponse.body);
        return tokenData.access_token;
    }

    /**
     * Constructs the API payload with payment details.
     * @param {Object} rec - Record object
     * @param {string} status - Payment status
     * @returns {Object} - API payload
     */
    function constructPayload(rec, status) {
        const currentDate = new Date().toISOString().split('T')[0];
        const paymentAmount = rec.getValue({ fieldId: 'paymentamount' }) || 0;
        const invoices = [];
        const lineCount = rec.getLineCount({ sublistId: 'apply' });
        for (var i = 0; i < lineCount; i++) {
            var apply = rec.getSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i,
            });
            if (apply) {
                invoices.push({
                    NsInvoiceId: rec.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i }),
                    NsInvoiceNumber: rec.getSublistValue({ sublistId: 'apply', fieldId: 'docnumber', line: i }) || '',
                    AppliedAmount: rec.getSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i }) || 0,
                });
            }
        }

        return {
            Status: status,
            Date: currentDate,
            nsPaymentId: rec.getValue({ fieldId: 'internalid' }) || '',
            ReferenceNumber: rec.getValue({ fieldId: 'tranid' }) || '',
            PaymentMethod: rec.getValue({ fieldId: 'paymentmethod' }) || '',
            PaymentAmount: paymentAmount,
            Invoices: invoices,
        };
    }

    /**
     * Sends the PUT request to the HMS endpoint.
     * @param {string} endpoint - HMS API endpoint
     * @param {string} nsPaymentId - NetSuite payment ID
     * @param {string} accessToken - Bearer token
     * @param {Object} payload - API payload
     * @returns {Object} - API response
     */
    function sendApiRequest(endpoint, nsPaymentId, accessToken, payload) {
        const apiUrl = `${endpoint}/api/netSuite/payments?nsPaymentId=${nsPaymentId}`;
        return https.post({
            url: apiUrl,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });
    }

    /**
     * Handles the API response and logs the outcome.
     * @param {Object} apiResponse - API response object
     * @param {string} nsPaymentId - NetSuite payment ID
     * @param {string} status - Payment status
     */
    function handleApiResponse(apiResponse, nsPaymentId, status) {
        log.debug('API Response', { code: apiResponse.code, body: apiResponse.body });

        switch (apiResponse.code) {
            case 200:
                log.audit('Payment Status Updated', { nsPaymentId: nsPaymentId, status: status });
                break;
            case 304:
                log.audit('No Changes Detected', { nsPaymentId: nsPaymentId });
                break;
            case 400:
                log.error('Bad Request', { body: apiResponse.body });
                throw new Error('Invalid request: ' + apiResponse.body);
            case 401:
                log.error('Unauthorized', { body: apiResponse.body });
                throw new Error('Invalid or missing token');
            case 404:
                log.error('Not Found', { body: apiResponse.body });
                throw new Error('Payment not found');
            case 409:
                log.error('Conflict', { body: apiResponse.body });
                throw new Error('Payment conflict');
            case 429:
                log.error('Too Many Requests', { retryAfter: apiResponse.headers['Retry-After'] });
                throw new Error('Too many requests, retry after ' + apiResponse.headers['Retry-After']);
            default:
                log.error('Unexpected Response', { code: apiResponse.code, body: apiResponse.body });
                throw new Error('Unexpected API response');
        }
    }

    return {
        afterSubmit: afterSubmit,
    };
});
