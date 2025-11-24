/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/format', 'N/search'], function (record, format, search) {
    function beforeLoad(context) {
        try {
            if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.VIEW) {
                const rec = context.newRecord;
                const sublistName = 'item';
                const lineCount = rec.getLineCount({
                    sublistId: sublistName
                });

                log.debug('Line Count', lineCount);

                for (let i = 0; i < lineCount; i++) {
                    const isNumbered = rec.getSublistValue({
                        sublistId: sublistName,
                        fieldId: 'isnumbered',
                        line: i
                    }) === 'T';

                    if (isNumbered) {
                        const itemId = rec.getSublistValue({
                            sublistId: sublistName,
                            fieldId: 'item',
                            line: i
                        });

                        var searchResults = searchExpiryItem(itemId);

                        log.debug({
                            title: 'searchResults===',
                            details: searchResults
                        });
                        if (searchResults == false) {

                            const inventoryDetailSubrecord = rec.getSublistSubrecord({
                                sublistId: sublistName,
                                fieldId: 'inventorydetail',
                                line: i
                            });

                            const lotLines = inventoryDetailSubrecord.getLineCount({
                                sublistId: 'inventoryassignment'
                            });

                            for (let j = 0; j < lotLines; j++) {

                                const inventoryNumberId = inventoryDetailSubrecord.getSublistValue({
                                    sublistId: 'inventoryassignment',
                                    fieldId: 'numberedrecordid',
                                    line: j
                                });

                                log.debug('Inventory Number ID', inventoryNumberId);

                                const newExpirationDate = format.parse({//'01/01/2999'
                                    value: '01/01/2999',
                                    type: format.Type.DATE
                                });

                                const inventoryNumberRecord = record.load({
                                    type: record.Type.INVENTORY_NUMBER,
                                    id: inventoryNumberId
                                });

                                inventoryNumberRecord.setValue('expirationdate', newExpirationDate);

                                const savedId = inventoryNumberRecord.save();
                                log.debug('Inventory Number Saved', savedId);

                            }
                        }
                    }
                }
            }
        } catch (e) {
            log.error('Error in beforeLoad', e.message);
        }
    }
    function searchExpiryItem(itemId) {
        var title = 'searchExpiryItem[::]';
        var expiryItem = false;
        try {
            var itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid", "anyof", itemId]
                    ],
                columns:
                    [
                        search.createColumn({ name: "type", label: "Type" }),
                        search.createColumn({ name: "custitem_ps_expiry_required", label: "Expiry Required" })
                    ]
            });
            itemSearchObj.run().each(function (result) {
                var data = result.getValue({ name: 'custitem_ps_expiry_required' });
                if (data) {
                    expiryItem = true;
                }
                return true;
            });

        } catch (e) {
            log.error(title + e.name, e.message);
        }
        return expiryItem;
    }

    return {
        beforeLoad: beforeLoad
    };
});
