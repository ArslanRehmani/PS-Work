/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * 
 */
define([
    './ItemService',
    './CustomerService',
    './VendorService',
    './InvoiceService',
    './PaymentService',
    './CreditMemoService',
    './VendorBillService',
    './VendorPaymentService',
    './VendorCreditService',
    './Utils/Validation'
], function(ItemService, CustomerService, VendorService, InvoiceService, PaymentService, CreditMemoService, VendorBillService, VendorPaymentService, VendorCreditService, Validation) {
    function post(context) {
        try {
            Validation.validateFields(context, ['type', 'action', 'data']);

            switch (context.type) {
                case 'ITEM':
                    return ItemService.handleRequest(context);
                case 'CUSTOMER':
                    return CustomerService.handleRequest(context);
                case 'VENDOR':
                    return VendorService.handleRequest(context);
                case 'INVOICE':
                    return InvoiceService.handleRequest(context);
                case 'CUSTOMER_PAYMENT':
                    return PaymentService.handleRequest(context);
                case 'CREDITMEMO':
                    return CreditMemoService.handleRequest(context);
                case 'VENDOR_BILL':
                    return VendorBillService.handleRequest(context);
                case 'VENDOR_PAYMENT':
                    return VendorPaymentService.handleRequest(context);
                case 'VENDOR_CREDIT':
                    return VendorCreditService.handleRequest(context);
                default:
                    throw { code: 'INVALID_TYPE', message: `Unsupported type: ${context.type}` };
            }
        } catch (e) {
            return { status: 'error', code: e.code || 'ER-000', message: e.message };
        }
    }
    return { post };
});