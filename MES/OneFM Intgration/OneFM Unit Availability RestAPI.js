/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 *@NModuleScope Public
 */
 

//Begin : RESTlet Script
//This function is used to update employee master data from HIS to NS
define(['N/record','N/search'],
  function(record,search) {

    function updateDormitoryUnit(dataIn) {
		try {
			//dataIn- From ONeFM, Unit Id and Status will receive
				log.debug({title: 'dataIn',details: JSON.stringify(dataIn)});	
				if(nullCheck(dataIn))
				{
					var onefminternalid = dataIn.unitid;
					var onefmunitstatus = dataIn.unitstatus;
					log.debug({title: 'updateDormitoryUnit',details: "onefminternalid"+onefminternalid+" | onefmunitstatus "+onefmunitstatus});	
					if( nullCheck(onefminternalid) && nullCheck(onefmunitstatus))
					{
							var unitinternalid = DormitoryUnitSearch(search,onefminternalid); // it searches Dormitory Unit
							log.debug({title: 'updateDormitoryUnit',details: "unitinternalid"+unitinternalid});
							if(nullCheck(unitinternalid))
							{
								var unitstatusid =	getUnitStatusListValue(search,onefmunitstatus); // it searches Unit Status Internal Id
								if(nullCheck(unitstatusid))
								{
									var loadRecord = record.load({
																	type: 'customrecord_dormitory_unitmaster', 
																	id: unitinternalid
									});
									
									loadRecord.setValue({ fieldId: 'custrecord_unitstatus', value: unitstatusid });				
									
									var recordId = loadRecord.save();
									log.debug({title: 'recordId',details: recordId});	
									if(nullCheck(recordId)){return {"statuscode":"200", "success":"true", "message": "Dormitory Unit Status updated successfully"};}
									else{return {"statuscode":"401", "success":"false", "message": "Dormitory Unit Status Not Updated"};}		
								}		
								else { return {"statuscode":"402","success":"false", "message":onefmunitstatus +' unitstatus is not available in netsuite.'}}
							}
							else { return {"statuscode":"403","success":"false", "message":'unitid '+onefminternalid+' is not mapped with netsuite unit master.'}}								
					}
					else { return {"statuscode":"404","success":"false", "message":'unitid and unitstatus parameters mandatory'}}
				}
				else { return {"statuscode":"405","success":"false", "message":'unitid and unitstatus parameters mandatory'}}
		}
		catch(err) {
		log.debug({title: 'err',details: err});	
		if(err.details) {
			return {"statuscode":"406","success":"false", "message":err.details}
		} else if(err.code) {
			return {"statuscode":"407","success":"false", "message":err.code}
		} else if(err.message) {
			return {"statuscode":"408","success":"false", "message":err.message}
		}
	}
	
    }
    return {
      post : updateDormitoryUnit
    };
  }
);
//End : This function is used to update employee master data from HIS to NS

//This function is used to serach Dormitory Unit Master Int id from OneM unit id.
function DormitoryUnitSearch(search,onefmunitid)
{
	var internalid = null;
		var unitSearchObj = search.create({
		   type: "customrecord_dormitory_unitmaster",
		   filters:
		   [
				["custrecord_onefminternalid","is",onefmunitid]
		   ],
		   columns:
		   [
			  search.createColumn({name: "internalid", label: "Internal ID"}),
			  search.createColumn({name: "custrecord_onefminternalid",label: "ONEFM INTERNAL ID"})
		   ]
		});
		log.debug({title: 'DormitoryUnitSearch',details :"unitSearchObj"+JSON.stringify(unitSearchObj)});
		if(nullCheck(unitSearchObj))
		{
			var searchResultCount = unitSearchObj.runPaged().count;
			var resultSet = unitSearchObj.run();
			var searchResult = resultSet.getRange({	start: 0, end: searchResultCount });
			log.debug({title: 'DormitoryUnitSearch',details :"searchResult"+ JSON.stringify(searchResult)});
			if(nullCheck(searchResult))
				internalid = searchResult[0].getValue({name: 'internalid'});
			
		}
		return internalid;
}	

//This function is used to serach Unit Status Internal id to set list/record field.
function getUnitStatusListValue(search,status)
{
	var unitvalue = '';
	if(nullCheck(status))
	{
		var listSearch = search.create({
											type: 'customlist_unitstatuslist',
											columns: ['internalid', 'name'],
											filters: ['name', 'is', status]
									});
		listSearch.run().each(function(searchResult) {
             unitvalue = searchResult.getValue({name : 'internalid'});
			 log.debug({title: 'getUnitStatusListValue',details :"unitvalue"+unitvalue});
             return unitvalue;
        });
	}
	return unitvalue;
}


function nullCheck(value)
{
	if (value != null && value != '' && value != undefined)
		return true;
	else
		return false;
}