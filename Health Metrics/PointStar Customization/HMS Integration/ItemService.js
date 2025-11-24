/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/currency', './Utils/Validation'], function(log, record, currency, Validation) {
    
    const SUBSCRIPTION_ITEM_CLASS = ['25'];
    function getItemTypeMap() {
        return {
            'Service': record.Type.SERVICE_ITEM,
            'Inventory': record.Type.INVENTORY_ITEM,
            'Non-Inventory': record.Type.NON_INVENTORY_ITEM,
            'Assembly': record.Type.ASSEMBLY_ITEM
        };
    }
    
    const BASE_PRICE_LEVEL_ID = 1; 

    function validateItemFields(itemData, subType) {
        Validation.validateFields(itemData, [
            'itemId', 'sku', 'itemType', 'subType', 
            'displayName', 'description'
        ]);

        if (['Sale', 'Resale'].includes(subType)) {
            Validation.validateFields(itemData, ['incomeAccount']);
        } 
        if (['Purchase', 'Resale'].includes(subType)) {
            Validation.validateFields(itemData, ['expenseAccount']);
        }
        
        // if (itemData.price && !itemData.currency) {
        //     throw { code: 'ER-005', message: 'Currency is required when price is provided' };
        // }
        
        if (itemData.taxCode && typeof itemData.taxCode !== 'string') {
            throw { code: 'ER-006', message: 'taxCode must be a string' };
        }
    }

    function createOrLoadRecord(action, itemType, nsItemId) {
        const ITEM_TYPE_MAP = getItemTypeMap();
        if (!ITEM_TYPE_MAP[itemType]) {
            throw { code: 'ER-007', message: `Unsupported itemType: ${itemType}` };
        }
        
        if (action === 'CREATE') {
            return record.create({ 
                type: ITEM_TYPE_MAP[itemType],
                isDynamic: true 
            });
        } else {
            return record.load({ 
                type: ITEM_TYPE_MAP[itemType], 
                id: nsItemId,
                isDynamic: true 
            });
        }
    }

    function setBaseFields(rec, itemData) {
        rec.setValue('itemid', itemData.sku);
        rec.setValue('custitem_ps_hms_item_id', itemData.itemId);
        rec.setValue('displayname', itemData.displayName);
        rec.setValue('description', itemData.description || '');
        rec.setValue('includechildren', true);
        
        if (itemData.taxable) {
            rec.setValue('taxschedule', 1); // Taxable
        } else {
            rec.setValue('taxschedule', 2); // Non-taxable
        }

        if (itemData.incomeAccount) {
            rec.setValue('incomeaccount', itemData.incomeAccount);
        }
        if (itemData.expenseAccount) {
            rec.setValue('expenseaccount', itemData.expenseAccount);
        }
        
        if (itemData.taxCode) {
            rec.setValue('taxcode', itemData.taxCode);
        }

        if(itemData.class) {
            rec.setValue('class', itemData.class);
            if(SUBSCRIPTION_ITEM_CLASS.indexOf(itemData.class) !== -1) {
                rec.setValue('revenuerecognitionrule', 3);
                rec.setValue('revrecforecastrule', 3);
            } else {
                rec.setValue('directrevenueposting', true);
            }
        } else {
            rec.setValue('directrevenueposting', true);
        }
        
        return rec;
    }

    function getCurrencyId(currencyCode) {
        try {
            const currencyMap = {
                'MYR': 1, 
                'USD': 2,
                'SGD': 6,
                'IDR': 7
            };
            
            return currencyMap[currencyCode] || 1; 
        } catch (e) {
            log.error('Error getting currency ID', e);
            return 1;
        }
    }

    function setPricing(rec, price, currencyCode) {
        if (!price) return rec;
        
        try {
            rec.setValue('price', price);
            rec.setValue('rate', price);
            const currencyId = getCurrencyId(currencyCode);
            rec.selectLine({
                sublistId: 'price1',
                line: 0
            });
            
            rec.setCurrentSublistValue({
                sublistId: 'price1',
                fieldId: 'pricelevel',
                value: BASE_PRICE_LEVEL_ID
            });
            
            rec.setCurrentSublistValue({
                sublistId: 'price1',
                fieldId: 'currency',
                value: currencyId
            });
            
            rec.setCurrentSublistValue({
                sublistId: 'price1',
                fieldId: 'price',
                value: price
            });
            
            rec.commitLine({ sublistId: 'price1' });
        } catch (e) {
            log.error('Error setting pricing', e);
        }
        
        return rec;
    }

    function saveItemRecord(rec) {
        return rec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
    }

    function createSuccessResponse(action, id) {
        return { 
            status: 'success', 
            message: `Item ${action.toLowerCase()}d successfully`,
            nsItemId: id 
        };
    }

    function createErrorResponse(error) {
        return {
            status: 'error',
            code: error.code || 'ER-000',
            message: error.message
        };
    }

    function handleRequest(context) {
        try {
            log.debug('handleRequest', JSON.stringify(context));
            validateItemFields(context.data, context.data.subType);
            const rec = createOrLoadRecord(
                context.action, 
                context.data.itemType, 
                context.data.nsItemId
            );
            setBaseFields(rec, context.data);
            if (context.data.price) {
                setPricing(rec, context.data.price, context.data.currency);
            }
            const id = saveItemRecord(rec);
            return createSuccessResponse(context.action, id);

        } catch (e) {
            return createErrorResponse(e);
        }
    }

    return { handleRequest };
});