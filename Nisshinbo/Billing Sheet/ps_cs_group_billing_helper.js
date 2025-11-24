/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([], () => {
    const fieldChanged = (context) => {
        let fieldId = context.fieldId;
        const filterFields = ['custpage_custfilter', 'custpage_currfilter', 'custpage_termfilter', 'custpage_accfilter', 'custpage_fromdate', 'custpage_todate'];

        // Only trigger reload when customer, from date, or to date is changed
        //if (fieldId === 'custpage_custfilter' || fieldId === 'custpage_fromdate' || fieldId === 'custpage_todate') {
        if (filterFields.includes(fieldId)) {
            let currentRecord = context.currentRecord;

            let customerId = currentRecord.getValue({ fieldId: 'custpage_custfilter' });

            if (customerId) {
                let currencyId = currentRecord.getValue({ fieldId: 'custpage_currfilter' });
                let termId = currentRecord.getValue({ fieldId: 'custpage_termfilter' });
                let accountId = currentRecord.getValue({ fieldId: 'custpage_accfilter' });
                let fromDate = currentRecord.getText({ fieldId: 'custpage_fromdate' });
                let toDate = currentRecord.getText({ fieldId: 'custpage_todate' });

                // Build new URL with params
                let url = new URL(window.location.href);
                let script = url.searchParams.get('script');
                let deploy = url.searchParams.get('deploy');

                //let baseUrl = window.location.origin + window.location.pathname;
                let baseUrl = window.location.href.split('?')[0];
                let params = [];

                if (script) params.push('script=' + script);
                if (deploy) params.push('deploy=' + deploy);
                if (customerId) params.push('custpage_custfilter=' + encodeURIComponent(customerId));
                if (currencyId) params.push('custpage_currfilter=' + encodeURIComponent(currencyId));
                if (termId) params.push('custpage_termfilter=' + encodeURIComponent(termId));
                if (accountId) params.push('custpage_accfilter=' + encodeURIComponent(accountId));
                if (fromDate) params.push('custpage_fromdate=' + encodeURIComponent(fromDate));
                if (toDate) params.push('custpage_todate=' + encodeURIComponent(toDate));

                let newUrl = baseUrl;
                if (params.length > 0) {
                    newUrl += '?' + params.join('&');
                }

                // Disable NetSuite's leave warning
                window.onbeforeunload = null;

                // Reload page
                window.location.href = newUrl;
            } else {
                let url = new URL(window.location.href);
                let script = url.searchParams.get('script');
                let deploy = url.searchParams.get('deploy');
                let mainFilter = url.searchParams.get('custpage_custfilter');

                if (mainFilter) {
                    let baseUrl = window.location.href.split('?')[0];
                    let params = [];
                    params.push('script=' + script);
                    params.push('deploy=' + deploy);

                    let newUrl = baseUrl;
                    if (params.length > 0) {
                        newUrl += '?' + params.join('&');
                    }
                    if (newUrl != url) {
                        window.onbeforeunload = null;
                        window.location.href = newUrl;
                    }
                }
            }
        }
    };

    return { fieldChanged };
});
