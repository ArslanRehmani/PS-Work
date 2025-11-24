/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {

    function afterSubmit(context) {
        var title = 'afterSubmit[::]';
        try {
            if (context.type == context.UserEventType.CREATE) {

                var rec = context.newRecord;

                var IFObj = record.load({
                    type: rec.type,
                    id: rec.id
                });

                var itemArray = getItemDetails(IFObj.id);

                log.debug({
                    title: 'itemArray',
                    details: itemArray
                });

                for (var i = 0; i < itemArray.length; i++) {

                    var lineId = itemArray[i].lineId;

                    if (lineId) {

                        var noOfCarton = itemArray[i].noOfCarton;

                        var noOfPallet = itemArray[i].noOfPallet;

                        var grossWeight = itemArray[i].grossWeight;

                        var packing = itemArray[i].packing;

                        var netWeight = itemArray[i].netWeight;

                        var palletSize = itemArray[i].palletSize;

                        var lineNo = IFObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'line',
                            value: lineId
                        });

                        if (lineNo > -1) {

                            IFObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_no_of_carton',
                                line: lineNo,
                                value: noOfCarton
                            });
                            IFObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_no_of_pallet',
                                line: lineNo,
                                value: noOfPallet
                            });
                            IFObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_gross_weight',
                                line: lineNo,
                                value: grossWeight
                            });
                            IFObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_if_packing',
                                line: lineNo,
                                value: packing
                            });
                            IFObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_if_net_weight',
                                line: lineNo,
                                value: netWeight
                            });
                            IFObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_if_pallet_size',
                                line: lineNo,
                                value: palletSize
                            });
                        }
                    }
                }

                var id = IFObj.save({ ignoreMandatoryFields: true });

                log.debug('Item Fulfillment ID', id);

            }

        } catch (e) {
            log.error(title + e.name, e.message);
        }
    }

    function getItemDetails(recId) {

        var itemArray = [];
        try {

            var transactionSearch = search.create({
                type: "itemfulfillment",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["type", "anyof", "ItemShip"],
                        "AND",
                        ["internalid", "anyof", recId],
                        "AND",
                        ["shipping", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["cogs", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "line", label: "Line ID" }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "quantity", label: "Quantity" }),
                        search.createColumn({
                            name: "custitem_ps_packing_pcs_carton",
                            join: "item",
                            label: "Packing (pcs/carton)"
                        }),
                        search.createColumn({
                            name: "custitem_ps_net_weight",
                            join: "item",
                            label: "Net Weight (kg/carton)"
                        }),
                        search.createColumn({
                            name: "custitem_ps_size_cartons_pallet",
                            join: "item",
                            label: "Pallet Size (cartons/pallet)"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "ROUND({quantity}/NULLIF({item.custitem_ps_packing_pcs_carton},0),5)",
                            label: "No Of Carton"
                        }),
                        search.createColumn({
                            name: "formulanumeric1",
                            formula: "ROUND(({quantity}/NULLIF({item.custitem_ps_packing_pcs_carton},0))/NULLIF({item.custitem_ps_size_cartons_pallet},0),5)",
                            label: "No Of Pallet"
                        }),
                        search.createColumn({
                            name: "formulanumeric2",
                            formula: "ROUND(({quantity}/NULLIF({item.custitem_ps_packing_pcs_carton},0)) * {item.custitem_ps_net_weight}, 5)",
                            label: "Gross Weight"
                        })
                    ]
            });

            var searchResult = transactionSearch.run().getRange({ start: 0, end: 1000 });

            for (var i = 0; i < searchResult.length; i++) {

                var lineId = searchResult[i].getValue({ name: 'line' });

                var itemId = searchResult[i].getValue({ name: 'item' });

                var noOfCarton = searchResult[i].getValue({
                    name: "formulanumeric",
                    formula: "ROUND({quantity}/NULLIF({item.custitem_ps_packing_pcs_carton},0),5)"
                });

                var noOfPallet = searchResult[i].getValue({
                    name: "formulanumeric1",
                    formula: "ROUND(({quantity}/NULLIF({item.custitem_ps_packing_pcs_carton},0))/NULLIF({item.custitem_ps_size_cartons_pallet},0),5)"
                });

                var grossWeight = searchResult[i].getValue({
                    name: "formulanumeric2",
                    formula: "ROUND(({quantity}/NULLIF({item.custitem_ps_packing_pcs_carton},0)) * {item.custitem_ps_net_weight}, 5)"
                });

                var packing = searchResult[i].getValue({ name: 'custitem_ps_packing_pcs_carton', join: "item" });

                var netWeight = searchResult[i].getValue({ name: 'custitem_ps_net_weight', join: "item" });

                var palletSize = searchResult[i].getValue({ name: 'custitem_ps_size_cartons_pallet', join: "item" });

                itemArray.push({ lineId, itemId, noOfCarton, noOfPallet, grossWeight, packing, netWeight, palletSize });

            }

        }
        catch (e) {
            log.error('getItemDetails Exception', e.message);
        }

        return itemArray || [];
    }

    return {
        afterSubmit: afterSubmit
    }
});
