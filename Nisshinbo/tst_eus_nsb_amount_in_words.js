/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'], function(record) {

    function afterSubmit(context) {
        log.debug({title: '0', details: 'Start'});

        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            return;
        }

        var newRecord = context.newRecord;
        var rectype = newRecord.getValue({ fieldId: 'type' });

        log.debug({title: '1', details: 'Submit ' + rectype + '/' + newRecord.type});
        
        if (rectype == 'check') {
            var totalAmount = newRecord.getValue({ fieldId: 'usertotal' });
        } else {
            if (rectype == 'custdep') {
                var totalAmount = newRecord.getValue({ fieldId: 'payment' });
            }
        }

        if (!totalAmount) {
            var totalAmount = newRecord.getValue({ fieldId: 'total' });
        }

        log.debug({title: '2', details: 'totalAmount: ' + totalAmount});

        if (totalAmount) {
            var amountInWords = convertNumberToWords(totalAmount);

            log.debug({title: '3', details: 'Amount in words: ' + amountInWords});

            // Save the value to your custom field.
            record.submitFields({
                type: newRecord.type,
                id: newRecord.id,
                values: {
                  custbody_ps_amt_in_word: amountInWords // Replace with your custom field ID.
                }
            });
        }
    }

    function convertNumberToWords(number) {
        var ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        var teens = ["", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        var tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        var thousands = ["", "Thousand", "Million", "Billion"];

        if (number === 0) return "Zero Baht only";

        var words = "";
        var numStr = number.toString();
        var numArray = numStr.split(".");
        var integerPart = parseInt(numArray[0], 10);

        var i = 0;
        while (integerPart > 0) {
            var part = integerPart % 1000;
            if (part > 0) {
                var partWords = convertHundreds(part);
                words = partWords + (thousands[i] ? " " + thousands[i] + " " : " ") + words;
            }
            integerPart = Math.floor(integerPart / 1000);
            i++;
        }

        if (numArray.length > 1) {
            var decimalPart = numArray[1].padEnd(2, "0");
            //words += " Baht and " + convertHundreds(decimalPart) + " Satang";
            words += "and " + decimalPart + "/100";
         } else {
            words += "only";
        }

        return words.trim();

        function convertHundreds(num) {
            var result = "";
            if (num > 99) {
                result += ones[Math.floor(num / 100)] + " Hundred ";
                num %= 100;
            }
            if (num > 10 && num < 20) {
                result += teens[num - 10] + " ";
            } else {
                result += tens[Math.floor(num / 10)] + " ";
                num %= 10;
                result += ones[num] + " ";
            }
            return result.trim();
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
