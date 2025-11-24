/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

define([
  "N/currentRecord",
  "N/record",
  "N/search",
  "N/http",
  "N/xml",
  "N/runtime",
  "./OneFM_Lib.js",
  "N/ui/dialog",
  "N/https",
], function (
  currentRecord,
  record,
  search,
  http,
  xml,
  runtime,
  libjs,
  dialog,
  https
) {
  var context_mode = "";
  function pageInit(context) {
    context_mode = context.mode;
    if (context.mode == "copy") {
      //comment - edit end of the development
      var record = currentRecord.get();
      record.setValue({
        fieldId: "custbody_ofm_contracttransfered_create",
        value: false,
      });
      record.setValue({
        fieldId: "custbody_ofm_contractcreate_response",
        value: "",
      });
    }
  }
  function contract_validate_insert(context) {
    if (context_mode == "edit") {
      var record = context.currentRecord;
      var currentRec = currentRecord.get();
      var sublistName = context.sublistId;
      var custom_form = currentRec.getValue({ fieldId: "customform" });
      if (custom_form == 101) {
        //101----Dormitory Contract Form
        if (sublistName == "recmachcustrecord_dormitory_salesorderref") {
          if (confirm("Are you updating existing line?")) {
            /*	record.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_dormitory_salesorderref',
                fieldId: 'custrecord_ofm_dormitory_unitupdated',
                value: true,
                ignoreFieldChange: true
              });*/
          }
        }
        return true;
      }
      return true;
    }
    return true;
  }

  //Begin: saveRecord functionality
  function saveRecord(context) {
    if (context_mode == "edit") {
      var record = context.currentRecord;
      var currentRec = currentRecord.get();
      var custom_form = currentRec.getValue({ fieldId: "customform" });
      if (custom_form == 101) {
        //101----Dormitory Contract Form
        if (
          confirm(
            "If you are updating contract then click on Unit Updated checkbox on dormitory line item for updated unit to transfer to OneFM"
          )
        ) {
          return true;
        } else {
          return false;
        }
      }
      return true;
    }
    return true;

    // var currentRec = currentRecord.get();
    // var line_count = currentRec.getLineCount({
    // sublistId: 'recmachcustrecord_dormitory_salesorderref'
    // });
    // var no_of_occupants=currentRec.getValue({fieldId:'custbody_dormitory_contract_occupants'});
    // if(!nullCheck(no_of_occupants)){
    // no_of_occupants=0;
    // }
    // var no_of_occupants_dorm=0;
    // var dorm_unit="";
    // var dorm_unit_text="";
    // for(var index=0;index<line_count;index++){
    // var is_terminated = currentRec.getSublistValue({sublistId: 'recmachcustrecord_dormitory_salesorderref',fieldId:'custrecord_ofm_contract_unitterminated',line:index});
    // dorm_unit = currentRec.getSublistValue({sublistId: 'recmachcustrecord_dormitory_salesorderref',fieldId:'custrecord_dormitory_unitno',line:index});
    // dorm_unit_text = currentRec.getSublistText({sublistId: 'recmachcustrecord_dormitory_salesorderref',fieldId:'custrecord_dormitory_unitno',line:index});
    // if(is_terminated==false){
    // if(nullCheck(dorm_unit)){
    // var no_of_occupants_dorm_fields = search.lookupFields({
    // type: 'customrecord_dormitory_unitmaster',
    // id: dorm_unit,
    // columns: 'custrecord_ofm_dorunitmast_occupantlimit'
    // });
    // no_of_occupants_dorm=no_of_occupants_dorm_fields.custrecord_ofm_dorunitmast_occupantlimit;
    // }
    // }

    // }
    // if(!nullCheck(no_of_occupants_dorm)){
    // no_of_occupants_dorm=0;
    // }
    // if(parseFloat(no_of_occupants)>parseFloat(no_of_occupants_dorm)){
    // alert('Max Occupancy for selected unit is '+no_of_occupants_dorm+'. Enter NO OF OCCUPANTS, accordingly. Thanks!');
    // return false;
    // }
    // else{
    // return true;
    // }

    // return true;
  }
  //End: saveRecord functionality

  //If Approve button click the Send to OneFM (This is handled with STD approve and event type on DEployment of script, so no any condition require in coding.)
  function approvedContract_OneFM() {
    try {
      alert("Contract transferring to OneFM");
      //Begin: If contract is created or copy and approv then send to OneFM
      //if(context.type == "create" || context.type == "copy"  || context.type == "edit") //comment - edit end of the development
      {
        //Begin: Post URL and Header Object
        var postURL = getOneFmURL();
        log.debug("postURL", postURL);
        var headerObj = getHeaderObject();
        //End:Post URL and Header Object

        //Begin: Variable declaration
        var contract_uid = "",
          contract_price = "",
          company_name = "",
          email = "",
          mailing_address = "",
          registered_address = "";
        var fax = "",
          netsuite_contract_id = "",
          account_manager = "",
          contract_value = "",
          unit_id = "",
          number_of_units = "";
        var contract_doc_url = "",
          start_date = "",
          end_date = "",
          number_of_beds = "";
        var contacts = [],
          contacts_person_name = "",
          contacts_phone = "",
          contacts_email = "",
          contacts_designation = "",
          contacts_is_primary = "";
        var cleaning_contract = "No",
          utilities = "No";
        var contract_type = "",
          old_contract_id = "";
        //End: '',iable declaration

        //Begin:Getting field details from SalesOrder (Contract/Job Order)
        var currentRec = currentRecord.get();
        if (nullCheck(currentRec)) {
          //If record is created then only all validation will work
          var loadRecord = record.load({
            type: "salesorder",
            id: currentRec.id,
            isDynamic: true,
          });

          contract_uid = currentRec.id;

          // getting contract type value
          contract_type = loadRecord.getValue({
            fieldId: "custbody_dormitory_contract_type",
          });
          if (nullCheck(contract_type)) {
            if (contract_type == "2") {
              contract_type = "RENEW";
            } else {
              contract_type = "NEW";
            }
          } else {
            contract_type = "NEW";
          }
          // end of contract type value

          // getting Old contract id

          old_contract_id = loadRecord.getValue({
            fieldId: "custbody_dormitory_previouscontract",
          });
          if (!nullCheck(old_contract_id)) {
            old_contract_id = "";
          }
          // old contract id completed

          var contract_subtotal = loadRecord.getValue({ fieldId: "subtotal" }); //if(runtime.getCurrentUser().id == 11701) alert('contract_subtotal ;'+contract_subtotal);
          contract_subtotal = nullCheck(contract_subtotal)
            ? contract_subtotal
            : 0;
          var contract_discount = loadRecord.getValue({
            fieldId: "discounttotal",
          });
          contract_discount = nullCheck(contract_discount)
            ? contract_discount
            : 0;
          contract_price = contract_value =
            parseFloat(contract_subtotal) + parseFloat(contract_discount);
          company_name = loadRecord.getText({ fieldId: "entity" });

          var company_name_id = loadRecord.getValue({ fieldId: "entity" });
          if (nullCheck(company_name_id)) {
            var fieldLookUp_enity = search.lookupFields({
              type: search.Type.CUSTOMER,
              id: company_name_id,
              columns: [
                "email",
                "fax",
                "isperson",
                "companyname",
                "custentity_ofm_cus_emailidaccountsinchar",
              ],
            });
            //email = fieldLookUp_enity.email;   //REplace email with decided in production UAT 22.11.21
            email = fieldLookUp_enity.custentity_ofm_cus_emailidaccountsinchar;
            fax = fieldLookUp_enity.fax;
            if (nullCheck(fax)) fax = fax.replace(/[^\d]/g, "");
            company_name = fieldLookUp_enity.companyname; //3--Company
          } //if(nullCheck(company_name))

          mailing_address = loadRecord.getValue({ fieldId: "billaddress" });
          if (nullCheck(mailing_address))
            mailing_address = mailing_address.replace(
              /(?:\\[rn]|[\r\n]+)+/g,
              ","
            );

          registered_address = loadRecord.getValue({ fieldId: "shipaddress" });
          if (nullCheck(registered_address))
            registered_address = registered_address.replace(
              /(?:\\[rn]|[\r\n]+)+/g,
              ","
            );

          netsuite_contract_id = loadRecord.getValue({ fieldId: "tranid" });
          account_manager = loadRecord.getText({ fieldId: "salesrep" });
          number_of_units = loadRecord.getValue({
            fieldId: "custbody_no_of_unit_dormitory",
          });
          start_date = loadRecord.getValue({ fieldId: "startdate" });
          end_date = loadRecord.getValue({ fieldId: "enddate" });
          number_of_beds = loadRecord.getValue({
            fieldId: "custbody_dormitory_contract_occupants",
          });

          cleaning_contract = loadRecord.getValue({
            fieldId: "custbody_cleaning_inc_excl",
          });
          cleaning_contract = cleaning_contract == true ? "Yes" : "No";
          utilities = loadRecord.getValue({
            fieldId: "custbody_utilities_inc_exc",
          });
          log.debug("utilities", "utilities :" + utilities);
          utilities = utilities == true ? "Yes" : "No";

          //Begin: Dormitory Line Item Fields,Get Dormitory Unit No field and ONeFM Unit Itenrnal id with lookup
          var dormitory_count = loadRecord.getLineCount({
            sublistId: "recmachcustrecord_dormitory_salesorderref",
          });
          log.debug("dormitory_count", "dormitory_count :" + dormitory_count);

          if (dormitory_count > 0) {
            //Begin:Code added for renewal contract
            if (contract_type == "2") {
              //2--Renewal
              //START : From UNIT NO field,search ONEFM INTERNAL ID
              for (var i = 0; i < dormitory_count; i++) {
                var is_terminated = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_ofm_contract_unitterminated",
                  line: i,
                });
                if (is_terminated == false) {
                  var unit_no = loadRecord.getSublistValue({
                    sublistId: "recmachcustrecord_dormitory_salesorderref",
                    fieldId: "custrecord_dormitory_unitno",
                    line: i,
                  });
                  if (nullCheck(unit_no)) {
                    var fieldLookUp_Unit = search.lookupFields({
                      type: "customrecord_dormitory_unitmaster",
                      id: unit_no,
                      columns: ["custrecord_onefminternalid"],
                    });
                    if (nullCheck(fieldLookUp_Unit))
                      unit_id = fieldLookUp_Unit.custrecord_onefminternalid;
                  }
                }
              }
              //END : From UNIT NO field,search ONEFM INTERNAL ID
            }
            //End:Code added for renewal contract
            else {
              var unit_no = loadRecord.getSublistValue({
                sublistId: "recmachcustrecord_dormitory_salesorderref",
                fieldId: "custrecord_dormitory_unitno",
                line: 0,
              });
              //Fome UNIT NO field,search ONEFM INTERNAL ID
              if (nullCheck(unit_no)) {
                var fieldLookUp_Unit = search.lookupFields({
                  type: "customrecord_dormitory_unitmaster",
                  id: unit_no,
                  columns: ["custrecord_onefminternalid"],
                });
                if (nullCheck(fieldLookUp_Unit))
                  unit_id = fieldLookUp_Unit.custrecord_onefminternalid;
              }
            }
          } //if(dormitory_count > 0)
          //End: Dormitory Line Item Fields,

          //Begin: Customer/Company Contact Details

          var custContactSearchResult = companyContactSearch(
            search,
            company_name_id,
            xml
          );

          log.debug(
            "custContactSearchResult",
            "custContactSearchResult :" +
            JSON.stringify(custContactSearchResult)
          );

          //End: Customer/Company Contact Details
          //Begin: Convert date into OneFM date format
          var monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          if (nullCheck(start_date)) {
            var buffer_days = loadRecord.getText({
              fieldId: "custbody_ofm_unitavailabilitybufferday",
            });
            if (!nullCheck(buffer_days)) {
              buffer_days = 0;
            }
            start_date.setDate(start_date.getDate() - Number(buffer_days));
            var date = start_date.getDate();
            if (date < 10) date = "0" + date;
            var Month = monthNames[start_date.getMonth()];
            var Year = start_date.getFullYear();
            start_date = date + " " + Month + " " + Year;
          }
          if (nullCheck(end_date)) {
            var date = end_date.getDate();
            if (date < 10) date = "0" + date;
            var Month = monthNames[end_date.getMonth()];
            var Year = end_date.getFullYear();
            end_date = date + " " + Month + " " + Year;
          }

          //End:Getting field details from SalesOrder (Contract/Job Order)
          //Do EscapeXML for string data and then preapare POst array to send
          //	contract_uid=				xml.escape({contract_uid : contract_uid}); //api not working on numebr
          company_name_id = xml.escape({ xmlText: company_name_id });
          company_name = xml.escape({ xmlText: company_name });
          email = xml.escape({ xmlText: email });
          mailing_address = xml.escape({ xmlText: mailing_address });
          registered_address = xml.escape({ xmlText: registered_address });
          fax = xml.escape({ xmlText: fax });
          netsuite_contract_id = xml.escape({ xmlText: netsuite_contract_id });
          account_manager = xml.escape({ xmlText: account_manager });
          //contract_value=             xml.escape({xmlText : contract_value});	//api not working on numebr
          unit_id = xml.escape({ xmlText: unit_id });
          //number_of_beds=             xml.escape({xmlText : number_of_beds});	//api not working on numebr
          contract_doc_url = xml.escape({ xmlText: contract_doc_url });
          start_date = xml.escape({ xmlText: start_date });
          end_date = xml.escape({ xmlText: end_date });
          cleaning_contract = xml.escape({ xmlText: cleaning_contract });
          utilities = xml.escape({ xmlText: utilities });

          //Begin: Prepare Array to send to OneFM in Post method
          var postarray = {
            contract_uid: contract_uid,
            netsuite_company_id: company_name_id,
            //"contract_price":contract_price ,
            company_name: company_name,
            email: email,
            mailing_address: mailing_address,
            registered_address: registered_address,
            fax: fax,
            netsuite_contract_id: netsuite_contract_id,
            account_manager: account_manager,
            contract_value: contract_value,
            unit_id: unit_id,
            number_of_beds: number_of_beds,
            //"number_of_units":number_of_units,
            contract_doc_url: contract_doc_url,
            start_date: start_date, //Format - "01 Aug 2021",
            end_date: end_date, //Format - "30 Aug 2021",
            //"number_of_units":number_of_units,
            contacts: custContactSearchResult,
            cleaning_contract: cleaning_contract,
            utilities: utilities,
            old_contract_id: old_contract_id,
            contract_type: contract_type,
          };
          log.debug("postarray", "postarray :" + JSON.stringify(postarray));

          var response = https.post({
            url: postURL,
            body: JSON.stringify(postarray),
            headers: headerObj,
          });
          loadRecord.setValue({
            fieldId: "custbody_ofm_onefmrequestfield",
            value: JSON.stringify(postarray),
          });
          if (nullCheck(response)) {
            log.debug(
              "PostMethod",
              "response Code:" +
              response.code +
              "response body:" +
              response.body
            );
            var oneFmResponse =
              "Response Code : " +
              response.code +
              " Response Body : " +
              response.body;

            loadRecord.setValue({
              fieldId: "custbody_ofm_contractcreate_response",
              value: oneFmResponse,
            });
            if (response.code == 200) {
              loadRecord.setValue({
                fieldId: "custbody_ofm_contracttransfered_create",
                value: true,
              });
              alert(
                "▬▬ Contract Transfered to OneFM. ▬▬\n\n response Code:\n" +
                response.code +
                "\n response body:" +
                response.body
              );
            } else {
              alert(
                "▬    Contract Not Transfered to OneFM.  ▬\n response Code:" +
                response.code +
                "\n response body:" +
                response.body +
                ""
              );
            }
          }

          loadRecord.save();
          location.reload();
        } //if(nullCheck(currentRec))
        //End: Prepare Post data to send to OneFM in Post method
      } //if(context.type == "create" || context.type == "copy"
      //End: If contract is created or copy and approv then send to OneFM
    } catch (err) {
      log.debug({ title: "err", details: err });
      if (err.details) {
        return { statuscode: "406", success: "false", message: err.details };
      } else if (err.code) {
        return { statuscode: "407", success: "false", message: err.code };
      } else if (err.message) {
        return { statuscode: "408", success: "false", message: err.message };
      }
    }
  }

  //EDIT (CONTRACT TRANSFERED TO ONEFM Checkbox is Checked) : If Approve button click the Send to OneFM (This is handled with STD approve and event type on DEployment of script, so no any condition require in coding.)
  function edit_approvedContract_OneFM() {
    try {
      //Begin: Post URL and Header Object
      alert("Contract transferring to OneFM");
      //var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/lead/contract/edit';
      var postURL = getURL_fun() + "api/netsuite/lead/contract/edit";
      log.debug({ title: "postURL", details: postURL });
      var headerObj = getHeaderObject();
      log.debug({ title: "headerObj", details: JSON.stringify(headerObj) });

      //End:Post URL and Header Object

      //Begin: Variable declaration
      var netsuite_contract_id = "",
        contract_value = "",
        is_cream_unit = "",
        cream_start_date = ""; //CR(cream) 21-02-2023 created a Variable creamservice and cream start date
      var terminated_units_array = [],
        new_units_array = [],
        updated_units_array = [];

      //End: '',iable declaration

      //Begin:Getting field details from SalesOrder (Contract/Job Order)
      var currentRec = currentRecord.get();
      if (nullCheck(currentRec)) {
        //If record is created then only all validation will work
        var loadRecord = record.load({
          type: currentRec.type,
          id: currentRec.id,
          isDynamic: true,
        });

        contract_uid = currentRec.id;

        var isAlreadyCreated = loadRecord.getValue({
          fieldId: "custbody_ofm_contracttransfered_create",
        });
        log.debug("isAlreadyCreated ", isAlreadyCreated);

        if (isAlreadyCreated == true) {
          // Checking if Contract Created Checkbox is checked.
          var company_name_id = loadRecord.getValue({ fieldId: "entity" });
          var number_of_beds = loadRecord.getValue({
            fieldId: "custbody_dormitory_contract_occupants",
          });

          netsuite_contract_id = loadRecord.getValue({ fieldId: "tranid" });
          log.debug("netsuite_contract_id ", netsuite_contract_id);
          var contract_subtotal = loadRecord.getValue({ fieldId: "subtotal" });
          contract_subtotal = nullCheck(contract_subtotal)
            ? contract_subtotal
            : 0;
          var contract_discount = loadRecord.getValue({
            fieldId: "discounttotal",
          });
          contract_discount = nullCheck(contract_discount)
            ? contract_discount
            : 0;
          contract_value =
            parseFloat(contract_subtotal) + parseFloat(contract_discount);
          log.debug("contract_value ", contract_value);
          // is_cream_unit = loadRecord.getValue({
          //   fieldId: "custbody_custrecord_crmsrv",
          // }); //CR(cream) 21-02-2023 Added creamservice
          // if (is_cream_unit == true) {
          //   is_cream_unit = "Yes";
          // } else {
          //   is_cream_unit = "No";
          // }

          is_cream_unit = loadRecord.getValue({ fieldId: 'custbody_custrecord_crmsrv' });
				// is_cream_unit = (is_cream_unit == true) ? 'Yes' : 'No';
				if (is_cream_unit == false) {
					is_cream_unit = loadRecord.getValue({ fieldId: 'custbodyps_cream_w_white_goods_incld' });
					log.debug('is_cream_unit from With White Good', is_cream_unit);
				}
				log.debug('is_cream_unit from With Without White Good', is_cream_unit);
				is_cream_unit = (is_cream_unit == true) ? 'Yes' : 'No';
				log.debug('is_cream_unit', 'is_cream_unit :' + is_cream_unit);
          log.debug("is_cream_unit", is_cream_unit);

          //is_cream_unit=  xml.escape({xmlText : is_cream_unit}); //CR(cream) 21-02-2023 Added creamservice

          cream_start_date = loadRecord.getValue({ fieldId: "startdate" }); //CR(cream) 21-02-2023 Added creamservice date

          log.debug("cream_start_date", cream_start_date);

          var monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          if (nullCheck(cream_start_date)) {
            log.debug("date_before_buffer_days", cream_start_date);
            var buffer_days = loadRecord.getText({
              fieldId: "custbody_ofm_unitavailabilitybufferday",
            });
            if (!nullCheck(buffer_days)) {
              buffer_days = 0;
            }
            cream_start_date.setDate(
              cream_start_date.getDate() - Number(buffer_days)
            );
            log.debug("date_after_buffer_days", cream_start_date);
            var date = cream_start_date.getDate();
            if (date < 10) date = "0" + date;
            var Month = monthNames[cream_start_date.getMonth()];
            var Year = cream_start_date.getFullYear();
            cream_start_date = date + " " + Month + " " + Year;
            log.debug("finaldate", cream_start_date);
          }

          //Begin: Dormitory Line Item Fields,Get Dormitory Unit No field and ONeFM Unit Itenrnal id with lookup
          var dormitory_count = loadRecord.getLineCount({
            sublistId: "recmachcustrecord_dormitory_salesorderref",
          });
          log.debug("dormitory_count", "dormitory_count :" + dormitory_count);

          if (dormitory_count > 0) {
            if (dormitory_count == 1) {
              var unit_id;

              for (var i = 0; i < dormitory_count; i++) {
                //START : From UNIT NO field,search ONEFM INTERNAL ID
                var unit_no = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_unitno",
                  line: i,
                });

                if (nullCheck(unit_no)) {
                  var fieldLookUp_Unit = search.lookupFields({
                    type: "customrecord_dormitory_unitmaster",
                    id: unit_no,
                    columns: ["custrecord_onefminternalid"],
                  });
                  if (nullCheck(fieldLookUp_Unit))
                    unit_id = fieldLookUp_Unit.custrecord_onefminternalid;
                }
                //END : From UNIT NO field,search ONEFM INTERNAL ID

                var block_no = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_block",
                  line: i,
                });

                var start_date = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_startdate",
                  line: i,
                });
                if (nullCheck(start_date)) {
                  start_date = formatDate(start_date);
                }

                var termination_date = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_terminationdate",
                  line: i,
                });
                if (nullCheck(termination_date)) {
                  termination_date = formatDate(termination_date);
                }

                var isTerminated = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_ofm_contract_unitterminated",
                  line: i,
                });

                var termination_type = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_terminationtype",
                  line: i,
                });

                var is_line_updated = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_ofm_dormitory_unitupdated",
                  line: i,
                });
                // log.debug('i ', i);
                // log.debug('onefm_internal_unit_id ', unit_id);
                // log.debug('onefm_internal_block_id ', block_no);
                // log.debug('date_of_termination ', termination_date);
                // log.debug('start_date ', start_date);
                // log.debug('isTerminated ', isTerminated);
                if (termination_type == 1) {
                  var rec = {
                    onefm_internal_unit_id: unit_id,
                    onefm_internal_block_id: block_no,
                    date_of_termination: termination_date,
                  };
                  terminated_units_array.push(rec);
                } else {
                  if (isTerminated == true) {
                    var rec = {
                      onefm_internal_unit_id: unit_id,
                      onefm_internal_block_id: block_no,
                      date_of_termination: termination_date,
                    };
                    terminated_units_array.push(rec);
                  } else {
                    if (is_line_updated == true) {
                      var rec = {
                        onefm_internal_unit_id: unit_id,
                        onefm_internal_block_id: block_no,
                        start_date: start_date,
                        end_date: termination_date,
                        number_of_beds: number_of_beds,
                        is_cream_unit: is_cream_unit, //CR(cream) 21-02-2023 Added creamservice
                        cream_start_date: cream_start_date, //CR(cream) 21-02-2023 Added creamservice date
                      };
                      updated_units_array.push(rec);
                    } else {
                      var rec = {
                        onefm_internal_unit_id: unit_id,
                        onefm_internal_block_id: block_no,
                        start_date: start_date,
                        end_date: termination_date,
                        number_of_beds: number_of_beds,
                        is_cream_unit: is_cream_unit, //CR(cream) 21-02-2023 Added creamservice
                        cream_start_date: cream_start_date, //CR(cream) 21-02-2023 Added creamservice date
                      };
                      new_units_array.push(rec);
                    }
                  }
                }
              }
            } else {
              var unit_id;

              for (var i = 0; i < dormitory_count; i++) {
                //START : From UNIT NO field,search ONEFM INTERNAL ID
                var unit_no = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_unitno",
                  line: i,
                });

                if (nullCheck(unit_no)) {
                  var fieldLookUp_Unit = search.lookupFields({
                    type: "customrecord_dormitory_unitmaster",
                    id: unit_no,
                    columns: ["custrecord_onefminternalid"],
                  });
                  if (nullCheck(fieldLookUp_Unit))
                    unit_id = fieldLookUp_Unit.custrecord_onefminternalid;
                }
                //END : From UNIT NO field,search ONEFM INTERNAL ID

                var block_no = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_block",
                  line: i,
                });
                log.debug({
                  title: "block_no",
                  details: block_no,
                });

                var start_date = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_startdate",
                  line: i,
                });
                if (nullCheck(start_date)) {
                  start_date = formatDate(start_date);
                }

                var termination_date = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_dormitory_terminationdate",
                  line: i,
                });
                if (nullCheck(termination_date)) {
                  termination_date = formatDate(termination_date);
                }

                var isTerminated = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_ofm_contract_unitterminated",
                  line: i,
                });

                //"is_line_updated" was missing to defined , issue fix on 23.2.22
                var is_line_updated = loadRecord.getSublistValue({
                  sublistId: "recmachcustrecord_dormitory_salesorderref",
                  fieldId: "custrecord_ofm_dormitory_unitupdated",
                  line: i,
                });

                //alert('isTerminated :'+isTerminated);
                //alert('is_line_updated :'+is_line_updated);
                // log.debug('i ', i);
                // log.debug('onefm_internal_unit_id ', unit_id);
                // log.debug('onefm_internal_block_id ', block_no);
                // log.debug('date_of_termination ', termination_date);
                // log.debug('start_date ', start_date);
                // log.debug('isTerminated ', isTerminated);
                //alert('i:'+i+'\n onefm_internal_unit_id : '+onefm_internal_unit_id+'\n isTerminated : '+isTerminated+'\n is_line_updated : '+is_line_updated);
                if (isTerminated == true) {
                  var rec = {
                    onefm_internal_unit_id: unit_id,
                    onefm_internal_block_id: block_no,
                    date_of_termination: termination_date,
                  };
                  terminated_units_array.push(rec);
                } else {
                  if (is_line_updated == true) {
                    var rec = {
                      onefm_internal_unit_id: unit_id,
                      onefm_internal_block_id: block_no,
                      start_date: start_date,
                      end_date: termination_date,
                      number_of_beds: number_of_beds,
                      is_cream_unit: is_cream_unit, //CR(cream) 21-02-2023 Added creamservice
                      cream_start_date: cream_start_date, //CR(cream) 21-02-2023 Added creamservice date
                    };
                    updated_units_array.push(rec);
                  } else {
                    var rec = {
                      onefm_internal_unit_id: unit_id,
                      onefm_internal_block_id: block_no,
                      start_date: start_date,
                      end_date: termination_date,
                      number_of_beds: number_of_beds,
                      is_cream_unit: is_cream_unit, //CR(cream) 21-02-2023 Added creamservice
                      cream_start_date: cream_start_date, //CR(cream) 21-02-2023 Added creamservice date
                    };
                    new_units_array.push(rec);
                  }
                }
              }
            }
          }

          log.debug(
            "terminated_units_array ",
            JSON.stringify(terminated_units_array)
          );
          log.debug("new_units_array ", JSON.stringify(new_units_array));
          var edited_by = runtime.getCurrentUser().name;

          var postarray = {
            netsuite_contract_no: netsuite_contract_id, //CR 24.11.22
            netsuite_contract_id: contract_uid, //Commented on 22.11.21 netsuite_contract_id,     at the time of production UAT
            terminated_units: terminated_units_array,
            new_units: new_units_array,
            updated_units: updated_units_array,
            contract_value: contract_value,
            netsuite_client_id: company_name_id,
            contract_edited_by: edited_by,
          };
          log.debug("postarray", "postarray :" + JSON.stringify(postarray));

          var response = https.post({
            url: postURL,
            body: JSON.stringify(postarray),
            headers: headerObj,
          });
          loadRecord.setValue({
            fieldId: "custbody_ofm_contract_editedofmrequest",
            value: JSON.stringify(postarray),
          });
          if (nullCheck(response)) {
            //log.debug('PostMethod','response Code:'+response.code+'response body:'+response.body);
            var oneFmResponse =
              "Response Code : " +
              response.code +
              " Response Body : " +
              response.body;

            loadRecord.setValue({
              fieldId: "custbody_ofm_contract_editedcontractre",
              value: oneFmResponse,
            });
            if (response.code == 200) {
              loadRecord.setValue({
                fieldId: "custbody_ofm_contract_editconttransfer",
                value: true,
              });
              loadRecord.setValue({
                fieldId: "custbody_ofm_update_contract_unit_deta",
                value: false,
              }); //code added on 17.12.21-For approved contract edit issue
              alert(
                "▬▬ Contract Transfered to OneFM. ▬▬\n\n response Code:\n" +
                response.code +
                "\n response body:" +
                response.body
              );
            } else {
              loadRecord.setValue({
                fieldId: "custbody_ofm_onfmeditfailcheck",
                value: true,
              });
              loadRecord.setValue({
                fieldId: "custbody_ofm_update_contract_unit_deta",
                value: false,
              }); //code added on 17.12.21-For approved contract edit issue
              alert(
                "▬    Contract Not Transfered to OneFM.  ▬\n response Code:" +
                response.code +
                "\n response body:" +
                response.body +
                ""
              );
            }
          }
          loadRecord.save();
          location.reload();
        }
      }
    } catch (err) {
      log.debug({ title: "err", details: err });
      if (err.details) {
        return { statuscode: "406", success: "false", message: err.details };
      } else if (err.code) {
        return { statuscode: "407", success: "false", message: err.code };
      } else if (err.message) {
        return { statuscode: "408", success: "false", message: err.message };
      }
    }
  }

  function formatDate(dateValue) {
    var finalDate;

    var monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    var date = dateValue.getDate();
    if (date < 10) date = "0" + date;
    var Month = monthNames[dateValue.getMonth()];
    var Year = dateValue.getFullYear();
    finalDate = date + " " + Month + " " + Year;

    return finalDate;
  }

  return {
    pageInit: pageInit,
    saveRecord: saveRecord,
    // setValTestFunc: setValTestFunc
    approvedContract_OneFM: approvedContract_OneFM,
    edit_approvedContract_OneFM: edit_approvedContract_OneFM,
    validateLine: contract_validate_insert,
  };
});
