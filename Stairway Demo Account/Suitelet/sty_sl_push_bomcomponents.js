/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

  const onRequest = (context) => {

    var poId = context.request.parameters.poId;
    if (!poId) return

    var poRec = record.load({
      type: record.Type.PURCHASE_ORDER,
      id: poId,
      isDynamic: true
    });

    var poLineCount = poRec.getLineCount({ sublistId: 'item' });

    var finalArray = [];
    var obj;

    for (var i = 0; i < poLineCount; i++) {
      obj = {};

      var itemId = poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
      var itemType = poRec.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
      var poQty = parseFloat(poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) || 0;
      var rate = parseFloat(poRec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })) || 0;
      var amount = parseFloat(poRec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i })) || 0;

      obj.itemIdParent = itemId;
      obj.qty = poQty;
      obj.rate = rate;
      obj.amount = amount;
      finalArray.push(obj);


      if (itemType && itemType.toLowerCase() === 'assembly') {

        /** First Search */
        var bomId = null;
        var assemblySearch = search.load({ id: 'customsearch5405' });

        assemblySearch.filterExpression = [
          ['type', 'anyof', 'Assembly'], 'AND',
          ['internalid', 'anyof', itemId], 'AND',
          ['assemblyitembillofmaterials.default', 'is', 'T']
        ];


        var bomResult = assemblySearch.run().getRange({ start: 0, end: 1 });
        if (bomResult && bomResult.length > 0) {
          bomId = bomResult[0].getValue({
            name: 'billofmaterials',
            join: 'assemblyItemBillOfMaterials'
          });
        }

        if (!bomId) {
          log.debug('No BOM found for item', itemId);
          continue;
        }

        log.debug('Found BOM ID', bomId);

        /** Second Search*/

        var bomSearch = search.load({ id: 'customsearch5404' });
        bomSearch.filterExpression = [['billofmaterials', 'anyof', bomId]];

        var components = bomSearch.run().getRange({ start: 0, end: 1000 });

        if (!components.length) {
          log.debug('No components found for BOM', bomId);
          continue;
        }

        components.forEach(result => {
          obj = {};
          obj.itemId = result.getValue({ name: 'item', join: 'component' });
          obj.qty = parseFloat(result.getValue({ name: 'quantity', join: 'component' })) || 1;
          var compQty = parseFloat(result.getValue({ name: 'quantity', join: 'component' })) || 1;
          var costPerAllocation = parseFloat((result.getValue({ name: 'custrecord377', join: 'component' })).replace("%", "")) || 100;

          obj.rate = (rate * (costPerAllocation / 100)) / compQty;
          var compRate = (rate * (costPerAllocation / 100)) / compQty;
          obj.amount = compRate * compQty;

          finalArray.push(obj);

        });
        poRec.removeLine({
          sublistId: 'item',
          line: i,
          ignoreRecalc: true
        });
        log.debug({
          title: 'remove LIne',
          details: 'YES'
        });
      }
    }

    if (finalArray && finalArray.length > 0) {
      poRec.selectNewLine({ sublistId: 'item' });
      poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: finalArray[0].itemIdParent });

      poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i, value: 0 });
      poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol29', line: i, value: finalArray[0].qty });

      poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', line: i, value: 0 });
      poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol30', line: i, value: finalArray[0].rate });

      poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol26', line: i, value: true });
      poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: finalArray[0].amount });

      poRec.commitLine({ sublistId: 'item' });
      for (var l = 1; l < finalArray.length; l++) {
        var data = finalArray[l];
        poRec.selectNewLine({ sublistId: 'item' });
        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: data.itemId });
        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol27', value: finalArray[0].itemIdParent });
        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: data.qty });
        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: data.rate });
        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: data.amount });

        poRec.commitLine({ sublistId: 'item' });
      }
    }


    poRec.setValue({
      fieldId: 'custbody_item_expand',
      value: true
    });

    var newId = poRec.save();

    log.debug({
      title: 'newId',
      details: newId
    });

  };

  return { onRequest };
});
