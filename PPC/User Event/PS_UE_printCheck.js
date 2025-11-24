/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget', 'N/file', 'N/format', 'N/redirect'],
    function (record, runtime, search, serverWidget, file, format, redirect) {

        function beforeLoad(context) {
            var title = 'beforeLoad[::]';
            try {
                var rec = context.newRecord;

                var form = context.form;
                form.addField({
                    id: 'custpage_citemsarray',
                    type: 'longtext',
                    label: 'Combined Items Array'
                });
                form.getField({
                    id: 'custpage_citemsarray'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL
                });
                // var groupArray = [{'Test': 'Data123'}];
                var groupArray = [];
                var lineArray = [];

                var subId = rec.getValue({ fieldId: 'subsidiary' });

                var subObj = record.load({
                    type: record.Type.SUBSIDIARY,
                    id: subId
                });

                var address = subObj.getValue({fieldId: 'mainaddress_text'});

                log.debug({
                    title: 'address',
                    details: address
                });

                var fieldLookUp = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: subId,
                    columns: ['name', 'custrecord_ss_anz_sub_phone', 'fax', 'custrecord_ss_anz_sub_email', 'custrecord_ss_anz_sub_ftrmsg_vp']
                });

                var body = {
                    subName: fieldLookUp.name,
                    subAddress: address,
                    subPhone: fieldLookUp.custrecord_ss_anz_sub_phone,
                    subFax: fieldLookUp.fax,
                    subEmail: fieldLookUp.custrecord_ss_anz_sub_email,
                    subFooter: fieldLookUp.custrecord_ss_anz_sub_ftrmsg_vp
                };

                groupArray.push({ type: "data", value: body });


                var expenceLineCount = rec.getLineCount({
                    sublistId: 'expense'
                });

                log.debug({
                    title: 'expenceLineCount',
                    details: expenceLineCount
                });

                if (expenceLineCount && expenceLineCount > 0) {

                    var obj;

                    for (var l = 0; l < expenceLineCount; l++) {

                        obj = {};

                        obj.account = rec.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'account_display',
                            line: l
                        });
                        obj.memo = rec.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'memo',
                            line: l
                        });
                        obj.grossAmount = rec.getSublistValue({
                            sublistId: 'expense',
                            fieldId: 'grossamt',
                            line: l
                        });
                        lineArray.push(obj)

                    }
                }

                groupArray.push({ type: "line", value: lineArray });
                log.debug("groupArray", groupArray);


                // if (context.type == context.UserEventType.PRINT) {

                rec.setValue('custpage_citemsarray', JSON.stringify(groupArray));

                // }


            } catch (e) {
                log.error(title + e.name, e.message);
            }
        }

        // function beforeSubmit(context) {

        // }

        // function afterSubmit(context) {

        // }

        return {
            beforeLoad: beforeLoad
            // beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        }
    });
