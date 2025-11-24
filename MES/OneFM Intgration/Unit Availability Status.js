/*----------------------------------------------------------------------------------------------
    Company Name 	:	Nuvista Technologies Pvt Ltd
    Script Name 	:	OneFM Customer Integration UserEvent
    Author 			:  	NVT Employee 
    Date            :   28-07-2021 
    Description		:	1. The Script is created for set unit from pop up window.

------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
//This function is used to set unit from pop up window
define([
    "N/ui/serverWidget",
    "N/search",
    "N/config",
    "N/format",
    "./Moment.js",
], function (serverWidget, search, config, format, moment) {
    //Begin: onRequest functionality
    function onRequest(context) {
        try {
            if (context.request.method === "GET") {

                var myForm = serverWidget.createForm({
                    title: "Find Unit(s)",
                    hideNavBar: true,
                });

                //var createRecord = nlapiResolveURL('RECORD','customrecord_pls_payrollrecord',H_Id);
                var message =
                    '<p><font face="Verdana" size="5" color="#FFA500"><B>Units not available</B></font></p>';
                //message+= '<p><font face="Verdana" size="5" color="#FFA500"><a href="'+createRecord+'">Click here to go back</a></font></p>';
                context.response.write(message);
            }
        } catch (e) {
            log.debug("onRequest:error", e);
        }
    }

    return {
        onRequest: onRequest,
    };
});
