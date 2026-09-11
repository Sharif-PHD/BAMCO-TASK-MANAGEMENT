/* Additional isolated fixture for messaging/history UI. Loaded after mock-api.js. */
(()=>{
 const base=window.fetch,api=window.__testApi,iso=new Date().toISOString(),today=iso.slice(0,10),manager=api.profiles[0],owner=api.profiles[1],thread='00000000-0000-4000-8000-000000000099';
 manager.display_name=manager.display_name||manager.full_name;manager.salutation='مهندس';owner.display_name=owner.display_name||owner.full_name;owner.salutation='سرکار خانم';owner.gender='خانم';owner.default_message_channel='portal';
 const snapshot={id:501,batch_id:'11111111-1111-4111-8111-111111111111',recipient_id:owner.id,recipient_name:owner.full_name,recipient_email:owner.email,subject:'گزارش وضعیت آزمایشی',body_template:'سرکار خانم متولی آزمایشی\n\n[جدول امور هشداری]\n\n[جدول امور دیرکردی]',final_text:'گزارش آزمایشی',tasks:[api.tasks[0]],warning_task_ids:[1],overdue_task_ids:[1],sticker_state:2,template_key:'state2',created_at:iso};
 api.messagingSnapshot=snapshot;
 const json=x=>new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}});
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,'https://bamco.test/'),endpoint=url.pathname.split('/').pop(),body=typeof init.body==='string'?JSON.parse(init.body):null;
  if(endpoint==='message-templates-canonical-20260911.json')return json({templates:Object.fromEntries(api.templates.map(t=>[t.template_key,{subject:t.subject_template,body:String(t.body_html).replace(/<[^>]+>/g,'')}]))});
  if(endpoint==='message_recipient_live_state')return json([{recipient_id:owner.id,recipient_name:owner.full_name,email:owner.email,active_count:1,warning_count:1,overdue_count:1,sticker_state:3,last_sent_at:iso,default_message_channel:'portal'}]);
  if(endpoint==='sent_message_log')return json([{log_key:'delivery:30',source_type:'delivery',source_id:'30',recipient_id:owner.id,recipient_name:owner.full_name,subject:'گزارش روزانه آزمایشی',channel:'portal',delivery_status:'sent',sent_at:iso,attempt_count:1,error_message:null,thread_key:'TEST',sender_id:manager.id,sender_name:manager.full_name,snapshot_id:501,portal_message_id:701}]);
  if(endpoint==='task_history')return json([{id:1,task_id:1,action:'updated',field_name:'owner_id',old_value:manager.id,new_value:owner.id,actor_id:manager.id,created_at:iso},{id:2,task_id:1,action:'updated',field_name:'due_date',old_value:null,new_value:today,actor_id:manager.id,created_at:iso},{id:3,task_id:1,action:'updated',field_name:'status',old_value:'منتظر پاسخ',new_value:'در حال انجام',actor_id:manager.id,created_at:iso}]);
  if(endpoint==='chat_conversation_list')return json([{id:thread,thread_type:'direct',task_id:null,system_recipient_id:owner.id,is_active:true,title:api.actor.role==='manager'?'پیام‌های خودکار سامانه · '+owner.full_name:'پیام‌های خودکار سامانه',updated_at:iso,last_message:'گزارش وضعیت آزمایشی',unread_count:1}]);
  if(endpoint==='chat_messages')return json([{id:990,thread_id:thread,sender_id:manager.id,body:'BAMCO_PORTAL_MESSAGE_V1:701',created_at:iso,is_system:true,message_kind:'state2',sender_name_snapshot:manager.full_name,source_portal_message_id:701}]);
  if(endpoint==='chat_system_message_payload')return json({portal_message_id:701,subject:snapshot.subject,body:snapshot.final_text,created_at:iso,sender_name:manager.full_name,snapshot});
  if(endpoint==='prepare_workflow_messages'){const id='22222222-2222-4222-8222-222222222222';api.preparedBatch=id;api.preparedSnapshots=[{...snapshot,id:502,batch_id:id,created_at:new Date().toISOString()}];return json(id)}
  if(endpoint==='message_snapshots'&&api.preparedBatch&&url.searchParams.get('batch_id')==='eq.'+api.preparedBatch)return json(api.preparedSnapshots);
  if(endpoint==='queue_message_batch')return json(1);
  if(endpoint==='chat_mark_read'||endpoint==='bamco_sync_sessions')return json(true);
  if(endpoint==='send-message-queue')return json({ok:true,sent:1,failed:0,pending:false,status:'sent'});
  return base(input,init);
 };
})();