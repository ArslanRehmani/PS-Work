/**
 * @NApiVersion 2.1
 */
define([], () => {
    return {
        TRANSACTION_EXCHANGE_RATE_MAP : {
            'buying_rate': [
                'invoice',
                'customerpayment',
                'salesorder',
                'cashsale',
                'creditmemo',
                'customerdeposit',
                'customerrefund',
            ],
            'selling_rate': [
                'vendorbill',
                'vendorpayment',
                'vendorprepayment',
                'purchaseorder',
                'vendorcredit',
                'check',
                'journalentry',
            ]
        },
        BASE_CURRENCY: '1',
    };
  });
  