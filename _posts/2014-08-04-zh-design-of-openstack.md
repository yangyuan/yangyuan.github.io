---
layout: post
title: （坑）OPENSTACK 设计细节小笔记
---

[url]http://www.yangyuan.info/post.php?id=1087[/url] 介绍了一个项目模板，抽取 OpenStack 几个项目中的公共部分，合并成一个公用项目模板。
私以为这个项目也有利于去阅读 OpenStack 其他项目代码。

API
----
一般是采用一个包装好的 WSGI 类，配合 PASTE 实现将请求的 URL 映射到对应的类和方法。
核心部分有以下几个：
WSGI 类，由 bin 直接触发，会自动调用 PASTE 配合 etc 下的 paste.ini，实现 loadapp。
paste.ini 内含各种 filter pipeline 什么的，最终一般会导向一个或者多个路由类。
路由类，一般 paste.ini 最终会导向一个路由类，路由类里会将 URL 导入不同的类和函数。
## paste
paste 有自己的文档，但是看起来着实费劲，其实不需要关心具体细节，知道 paste.ini 怎么用就行。paste 是个典型的中间件管理模块。
composite 有点类似于路由，能够将请求导入到其他不同的 filter、pipeline、composite 和 app 组合。
app 通常会指定到一个类或者类工厂，用于处理请求，对应的类可以使用 urlmap 方式映射 url 到函数。
filter 则是一个用于检测请求的类，比如经常用 filter 处理验证。
pipeline 则像是一个模板，一般有一串 filter 和一个 app 构成。

SERVICE
----
不同项目对 Service 的定义有一定差距，姑且我们可以认为 Service 有两种，WSGI Service 和 RPC Service。
WSGI Service 一般都是 API，可以直接响应对应的 Client，只有个别是没有的。
RPC Service 都含有一个 topic，一般至少需要连接消息队列来交互，有的还需要配合数据库相互相互，项目数据库里通常也有个 service 表，在 Nova 里，是只含有的 RPC Service 数据的。
访问 WSGI Service 通常走 Client，访问 RPC Service 则需要调用 RPC 模块，旧代码使用 openstack.common.rpc，新代码使用 oslo.messaging，RPC Service 经常还有个本地 API，一般会检测是否是本机，如果是本机，就走本地 API。
WSGI Service 的核心是 router + mapper。
RPC Service 的核心是 service + manager，访问则使用 rpcapi, api，比如 Nova 的 nova.service，配置了一些 service，利用 cmd 可以调用执行，manager, rpcapi, api 则放在不同的目录下。

RPC
----





数据库
----

	def adapter_get(context, id):
	    return IMPL.adapter_get(context, id)
	
	def adapter_create(context, values):
	    return IMPL.adapter_create(context, values)
	
	def adapter_update(context, id, values):
	    return IMPL.adapter_update(context, id, values)
	
	def adapter_delete(context, id):
	    return IMPL.adapter_delete(context, id)
	
	def adapter_get(context, id, session=None):
	    result = model_query(context, models.NavigatorAdapter, session=session).filter_by(id=id).first()
	    if not result:
	        raise
	    return result
	
	def adapter_create(context, values):
	    ref = models.NavigatorAdapter()
	    ref.update(values)
	    ref.save()
	    return ref
	
	def adapter_update(context, id, values):
	    session = get_session()
	    with session.begin():
	        ref = resource_get(context, id, session=session)
	        ref.update(values)
	        ref.save(session=session)
	
	def adapter_update(context, id):
	    session = get_session()
	    with session.begin():
	        ref = resource_get(context, id, session=session)
	        ref.delete(session=session)
