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
        //get parameters
        var contracat_start_date =
          context.request.parameters.contract_start_date_param;
        //log.debug("contracat_start_date",contracat_start_date);
        var postal_code = context.request.parameters.postal_code_param;
        // log.debug("postal_code",postal_code);
        var current_billing_start_date =
          context.request.parameters.billing_start_date_param;
        //log.debug("current_billing_start_date",current_billing_start_date);
        var current_billing_end_date =
          context.request.parameters.billing_end_date_param;
        //log.debug("current_billing_end_date",current_billing_end_date);
        var parse_current_billing_start_date = "";
        var parse_current_billing_end_date = "";
        if (nullCheck(current_billing_start_date)) {
          parse_current_billing_start_date = format.parse({
            value: current_billing_start_date,
            type: format.Type.DATE,
          });
        }
        if (nullCheck(current_billing_end_date)) {
          parse_current_billing_end_date = format.parse({
            value: current_billing_end_date,
            type: format.Type.DATE,
          });
        }

        var unit_Array = [];
        var unit_id_Array = [];
        var dorm_records_unit_id = [];
        var unique_unit_Array = [];

        //Begin: load saved search from transaction
        var salesorder_search = search.load({
          id: "customsearch_ofm_contracts_dormexpirydat",
        });

        //add filter for saved search
        var filter1 = search.createFilter({
          name: "custrecord_dormitory_postalcode",
          join: "custrecord_dormitory_salesorderref",
          operator: search.Operator.ANYOF,
          values: [postal_code],
        });
        salesorder_search.filters.push(filter1);

        if (nullCheck(contracat_start_date)) {
          var filter2 = search.createFilter({
            name: "custrecord_dormitory_terminationdate",
            join: "custrecord_dormitory_salesorderref",
            operator: search.Operator.BEFORE,
            values: [contracat_start_date],
          });
          salesorder_search.filters.push(filter2);
        }

        if (nullCheck(salesorder_search)) {
          // declare array for results
          var sales_order_results = [];
          var count = 0;
          var pageSize = 1000;
          var start = 0;

          // run saved search
          do {
            var subresults = salesorder_search.run().getRange({
              start: start,
              end: start + pageSize,
            });

            sales_order_results = sales_order_results.concat(subresults);
            count = subresults.length;
            start += pageSize;
          } while (count == pageSize);

          //log.debug("sales_order_results",sales_order_results.length);

          for (
            var sales_order_results_index = 0;
            sales_order_results_index < sales_order_results.length;
            sales_order_results_index++
          ) {
            var array_index = sales_order_results[sales_order_results_index];
            unit_Array.push({
              unit_id: array_index.getValue({
                name: "custrecord_dormitory_unitno",
                join: "CUSTRECORD_DORMITORY_SALESORDERREF",
                label: "Unit No",
              }),
              unit_text: array_index.getText({
                name: "custrecord_dormitory_unitno",
                join: "CUSTRECORD_DORMITORY_SALESORDERREF",
                label: "Unit No",
              }),
            });
          }
          //log.debug("unit_Array",unit_Array.length);
        }
        //End: load saved search from transaction

        //Begin:load saved search from Dormitory Unit Master
        log.debug({
          title: "unit_Array First Search",
          details: unit_Array,
        });

        log.debug({
          title: "postal_code++++",
          details: postal_code,
        });
        var dormitory_search = search.load({
          id: "customsearch_ofm_dormitoryunitmaster_lis",
        });

        var filter_dormitory = search.createFilter({
          name: "parent",
          operator: search.Operator.ANYOF,
          values: [postal_code],
        });
        dormitory_search.filters.push(filter_dormitory);
        // declare array for results
        if (nullCheck(dormitory_search)) {
          var dormitory_results = [];
          var count_dormitory = 0;
          var pageSize_dormitory = 1000;
          var start_dormitory = 0;

          // run saved search
          do {
            var subresults_dormitory = dormitory_search.run().getRange({
              start: start_dormitory,
              end: start_dormitory + pageSize_dormitory,
            });

            dormitory_results = dormitory_results.concat(subresults_dormitory);
            count_dormitory = subresults_dormitory.length;
            start_dormitory += pageSize_dormitory;
          } while (count_dormitory == pageSize_dormitory);

          for (
            var dormitory_results_index = 0;
            dormitory_results_index < dormitory_results.length;
            dormitory_results_index++
          ) {
            var array_index_dorm = dormitory_results[dormitory_results_index];
            unit_Array.push({
              unit_id: array_index_dorm.getValue({
                name: "internalid",
                label: "Internal ID",
              }),
              unit_text: array_index_dorm.getValue({
                name: "name",
                label: "Name",
              }),
            });
            unit_id_Array.push(
              parseInt(
                array_index_dorm.getValue({
                  name: "internalid",
                  label: "Internal ID",
                })
              )
            );
          }
        }
        log.debug({
          title: "unit_Array Second Search",
          details: unit_Array,
        });
        //End:load saved search from Dormitory Unit Master

        //Begin:load saved search from Dormitory record
        var dormitory_record_search = search.load({
          id: "customsearch_dormitorysearchdeletelist",
        });
        if (nullCheck(unit_id_Array)) {
          var filter_dormitory_records = search.createFilter({
            name: "custrecord_dormitory_unitno",
            operator: search.Operator.ANYOF,
            values: unit_id_Array,
          });
          dormitory_record_search.filters.push(filter_dormitory_records);
        }
        log.debug("unit_id_Array", unit_id_Array);
        // declare array for results
        if (nullCheck(dormitory_record_search)) {
          var dormitory_record_results = [];
          var count_dormitory_record = 0;
          var pageSize_dormitory_record = 1000;
          var start_dormitory_reocrd = 0;

          // run saved search
          do {
            var subresults_dormitory = dormitory_record_search.run().getRange({
              start: start_dormitory_reocrd,
              end: start_dormitory_reocrd + pageSize_dormitory_record,
            });

            dormitory_record_results =
              dormitory_record_results.concat(subresults_dormitory);
            count_dormitory_record = subresults_dormitory.length;
            start_dormitory_reocrd += pageSize_dormitory_record;
          } while (count_dormitory_record == pageSize_dormitory_record);
          log.debug(
            "dormitory_record_results",
            dormitory_record_results.length
          );
          for (
            var dormitory_record_results_index = 0;
            dormitory_record_results_index < dormitory_record_results.length;
            dormitory_record_results_index++
          ) {
            var array_index_dorm_record =
              dormitory_record_results[dormitory_record_results_index];
            var old_billstardate = array_index_dorm_record.getValue({
              name: "custrecord_dormitory_startdate",
              label: "Billing start date",
            });
            var old_billenddate = array_index_dorm_record.getValue({
              name: "custrecord_dormitory_terminationdate",
              label: "Date of Termination & Expiry",
            });
            var converted_old_billstardate = "";
            var converted_old_billenddate = "";

            if (nullCheck(old_billstardate)) {
              converted_old_billstardate = format.parse({
                value: old_billstardate,
                type: format.Type.DATE,
              });
              //converted_old_billstardate=new Date(old_billstardate);
            }
            if (nullCheck(old_billenddate)) {
              converted_old_billenddate = format.parse({
                value: old_billenddate,
                type: format.Type.DATE,
              });
              //converted_old_billenddate=new Date(old_billenddate);
            }
            // log.debug('parse_current_billing_start_date', parse_current_billing_start_date)
            // log.debug('parse_current_billing_end_date', parse_current_billing_end_date)
            // log.debug('converted_old_billstardate', converted_old_billstardate)
            // log.debug('converted_old_billenddate', converted_old_billenddate)

            if (
              parse_current_billing_start_date >= converted_old_billstardate &&
              parse_current_billing_start_date <= converted_old_billenddate
            ) {
              // log.debug('1', '1')
              dorm_records_unit_id.push({
                unit_id: array_index_dorm_record.getValue({
                  name: "custrecord_dormitory_unitno",
                  label: "Unit No",
                }),
              });
            }
            if (
              parse_current_billing_end_date >= converted_old_billstardate &&
              parse_current_billing_end_date <= converted_old_billenddate
            ) {
              // log.debug('2', '2')
              dorm_records_unit_id.push({
                unit_id: array_index_dorm_record.getValue({
                  name: "custrecord_dormitory_unitno",
                  label: "Unit No",
                }),
              });
            }

            if (
              converted_old_billstardate >= parse_current_billing_start_date &&
              converted_old_billstardate <= parse_current_billing_end_date
            ) {
              // log.debug('3', '3')
              if (
                converted_old_billenddate >= parse_current_billing_start_date &&
                converted_old_billenddate <= parse_current_billing_end_date
              ) {
                dorm_records_unit_id.push({
                  unit_id: array_index_dorm_record.getValue({
                    name: "custrecord_dormitory_unitno",
                    label: "Unit No",
                  }),
                });
              }
            }
          }
        }
        //End:load saved search from Dormitory record
        log.debug("unit_Array", unit_Array);
        log.debug("dorm_records_unit_id", dorm_records_unit_id);
        var unique_dorm_records_unit_id_Array = [];
        if (nullCheck(dorm_records_unit_id)) {
          unique_dorm_records_unit_id_Array = removeDuplicateswithproperty(
            dorm_records_unit_id,
            "unit_id"
          );
        }

        if (nullCheck(unique_dorm_records_unit_id_Array)) {

          log.debug({
            title: 'unique_dorm_records_unit_id_Array AR',
            details: unique_dorm_records_unit_id_Array
          });
          for (
            var dorm_records_unit_id_index = 0;
            dorm_records_unit_id_index <
            unique_dorm_records_unit_id_Array.length;
            dorm_records_unit_id_index++
          ) {
            var old_unit_id =
              unique_dorm_records_unit_id_Array[dorm_records_unit_id_index]
                .unit_id;

            for (
              var unit_Array_index = 0;
              unit_Array_index < unit_Array.length;
              unit_Array_index++
            ) {
              var new_unit_id = unit_Array[unit_Array_index].unit_id;
              // log.debug("new_unit_id=== OUT" + " old_unit_id=== OUT", new_unit_id + ' ' + old_unit_id);

              if (old_unit_id == new_unit_id) {

                // log.debug("old_unit_id=== IN " + "new_unit_id===IN", old_unit_id + ' ' + new_unit_id);
                //delete unit_Array[unit_Array_index];
                unit_Array.splice(unit_Array_index, 1);
              }
            }
          }
        }

        var myForm = serverWidget.createForm({
          title: "Find Unit(s)",
          hideNavBar: true,
        });
        log.debug("unit_Array LAST", unit_Array);
        if (nullCheck(unit_Array)) {
          unique_unit_Array = removeDuplicateswithproperty(
            unit_Array,
            "unit_id"
          );
          log.debug(
            "unique_unit_Array LAST Remove Duplication",
            unique_unit_Array
          );

          //add select option field
          var selectField = myForm.addField({
            id: "custpage_selectitem",
            label: "Select Unit",
            type: serverWidget.FieldType.SELECT,
          });
          //   selectField.addSelectOption({ value: "", text: "" });
          //add unit values to select field from array
          for (
            var unit_Array_index = 0;
            unit_Array_index < unique_unit_Array.length;
            unit_Array_index++
          ) {
            selectField.addSelectOption({
              value: unique_unit_Array[unit_Array_index].unit_id,
              text: unique_unit_Array[unit_Array_index].unit_text,
            });
          }

          myForm.addSubmitButton({
            label: "Submit",
          });

          context.response.writePage({
            pageObject: myForm,
          });
        } else {
          //var createRecord = nlapiResolveURL('RECORD','customrecord_pls_payrollrecord',H_Id);
          var message =
            '<p><font face="Verdana" size="5" color="#FFA500"><B>Units not available</B></font></p>';
          //message+= '<p><font face="Verdana" size="5" color="#FFA500"><a href="'+createRecord+'">Click here to go back</a></font></p>';
          context.response.write(message);
        }
      } else {
        var selecteditem = context.request.parameters.custpage_selectitem;
        //Begin:set selected unit to current line
        var str = "";
        str +=
          '<html><head><script>window.opener.nlapiSetCurrentLineItemValue("recmachcustrecord_dormitory_salesorderref","custrecord_dormitory_unitno"';
        str += ',"' + selecteditem + '");';
        str += "window.close();</script></head><body></body></html> ";
        context.response.write({
          output: str,
        });
        //End:set selected unit to current line
      }
    } catch (e) {
      log.debug("onRequest:error", e);
    }
  }
  //End: onRequest functionality

  //Begin:To check null values
  function nullCheck(value) {
    if (value != null && value != "" && value != undefined) return true;
    else return false;
  }
  //End:To check null values

  //Begin:Remove Duplicate value from array using property
  function removeDuplicateswithproperty(arr, prop1) {
    var new_arr = [];
    var lookup = {};

    for (var i in arr) {
      lookup[arr[i][prop1]] = arr[i];
    }

    for (i in lookup) {
      new_arr.push(lookup[i]);
    }

    return new_arr;
  }
  //End:Remove Duplicate value from array using property
  return {
    onRequest: onRequest,
  };
});
