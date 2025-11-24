/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/ui/serverWidget', 'N/search', 'N/format'], (runtime, serverWidget, search, format) => {
    const beforeLoad = (scriptContext) => {
        const { type, form, newRecord } = scriptContext;

        if (type === scriptContext.UserEventType.PRINT && newRecord.id) {
            // Add sublist to form
            const sublist = form.addSublist({
                id: 'custpage_sublist_detail',
                type: serverWidget.SublistType.LIST,
                label: 'Custom Lines',
            });

            sublist.addField({ id: 'custrecord_bsd_trantype', label: 'Transaction Type', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custrecord_bsd_tranid', label: 'Transaction ID', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custrecord_bsd_tranno', label: 'Transaction No.', type: serverWidget.FieldType.TEXT }); // From transaction
            sublist.addField({ id: 'custrecord_bsd_trandate', label: 'Transaction Date', type: serverWidget.FieldType.DATE });
            sublist.addField({ id: 'custrecord_bsd_amount', label: 'Amount', type: serverWidget.FieldType.CURRENCY }); // Total
            sublist.addField({ id: 'custrecord_bsd_taxamt', label: 'Tax', type: serverWidget.FieldType.CURRENCY }); // From transaction
            sublist.addField({ id: 'custrecord_bsd_subtotal', label: 'Subtotal', type: serverWidget.FieldType.CURRENCY }); // From transaction

            const detailSearch = search.create({
                type: 'customrecord_ps_billing_sheet_detail',
                filters: [['custrecord_bs_id', 'anyof', newRecord.id], 'AND', ['custrecord_bsd_tranid.mainline', 'is', 'T']],
                columns: [
                    'custrecord_bsd_trantype',
                    'custrecord_bsd_tranid',
                    'custrecord_bsd_trandate',
                    'custrecord_bsd_amount', // Total amount from child
                    search.createColumn({ name: 'tranid', join: 'custrecord_bsd_tranid' }),
                    search.createColumn({ name: 'taxtotal', join: 'custrecord_bsd_tranid' }),
                    //search.createColumn({ name: 'subtotal', join: 'custrecord_bsd_tranid' }), // Subtotal amount from transaction
                    //search.createColumn({ name: 'formulanumeric', formula: '{amount} - {taxtotal}', label: 'Subtotal' }),
                ],
            });

            let i = 0;
            detailSearch.run().each((result) => {
                const tranType = result.getValue('custrecord_bsd_trantype');
                const tranId = result.getValue('custrecord_bsd_tranid');
                const tranDate = result.getValue('custrecord_bsd_trandate');
                const totalAmt = result.getValue('custrecord_bsd_amount');

                const tranNo = result.getValue({ name: 'tranid', join: 'custrecord_bsd_tranid' });
                const taxAmt = result.getValue({ name: 'taxtotal', join: 'custrecord_bsd_tranid' });
                //const subtotal = result.getValue({ name: 'subtotal', join: 'custrecord_bsd_tranid' });
                //const subtotal = result.getValue({ name: 'formulanumeric', formula: '{amount} - {taxtotal}' });
                const subtotal = totalAmt - taxAmt;

                if (tranType) sublist.setSublistValue({ id: 'custrecord_bsd_trantype', line: i, value: tranType });
                if (tranId) sublist.setSublistValue({ id: 'custrecord_bsd_tranid', line: i, value: tranId });
                if (tranNo) sublist.setSublistValue({ id: 'custrecord_bsd_tranno', line: i, value: tranNo });

                if (tranDate) {
                    sublist.setSublistValue({
                        id: 'custrecord_bsd_trandate',
                        line: i,
                        value: format.format({ value: tranDate, type: format.Type.DATE }),
                    });
                }

                if (subtotal) sublist.setSublistValue({ id: 'custrecord_bsd_subtotal', line: i, value: subtotal });
                if (taxAmt) sublist.setSublistValue({ id: 'custrecord_bsd_taxamt', line: i, value: taxAmt });
                if (totalAmt) sublist.setSublistValue({ id: 'custrecord_bsd_amount', line: i, value: totalAmt });

                i++;
                return true;
            });
        }
    };

    return { beforeLoad };
});
