---
layout: post
title: OpenStack 限额（Quota）设计与实现
---

限额（Quota）模块是在Nova中比较小巧的一个模块。
[url]https://github.com/openstack/nova/blob/master/nova/quota.py[/url]
模块很精简，并且具有比较好的扩展性。
[!code=python]

原理和概念
----
### 抽象
抽象出来的东西主要有三个：资源、驱动和引擎。
资源：可以被统计和控制的资源。
驱动：用于存取限额数据的接口。
引擎：利用驱动，提供使用接口。
### 功能
限额能够以user、project以及 quota class 这三个单位计算限额。默认情况下，是以project为计算单元。

资源
----
### BaseResource
定义了一个限额单元的基本属性，如下
	class BaseResource(object):
	    def __init__(self, name, flag=None):
	    def quota(self, driver, context, **kwargs):
	    def default(self):
quota方法用于获取资源的使用量，default方法用户获取默认值。
默认情况下，BaseResource使用context里的project_id和quota_class，决定使用何种规律获取资源的使用量。（按照用户呢，还是按照用户组呢）
Nova并非直接使用BaseResource，而是将它扩展成AbsoluteResource、ReservableResource、CountableResource。
### AbsoluteResource：
即BaseResource。
### ReservableResource：
相比BaseResource，多了sync方法，sync会被驱动调用，用于在计算限额之前，先同步限额信息（到本地和数据库）。
ReservableResource只能用于project绑定的资源。
### CountableResource：
相比BaseResource，多了count方法，count方法必须给出一个函数，自己计算限额，其返回值里会包含限额实际使用值。

驱动
----
驱动是实现限额逻辑的主要方法，其必须提供以下接口。
	#取得限额（以各种单位下的）使用值。
	def get_by_project_and_user(self, context, project_id, user_id, resource):
	def get_by_project(self, context, project_id, resource):
	def get_by_class(self, context, quota_class, resource):
	#取得限额（以各种单位下的）默认限制值。
	def get_defaults(self, context, resources):
	def get_class_quotas(self, context, resources, quota_class, defaults=True):
	def get_user_quotas(self, context, resources, project_id, user_id, quota_class=None, defaults=True, usages=True):
	def get_project_quotas(self, context, resources, project_id, quota_class=None, defaults=True, usages=True, remains=False):
	#取得某个限额可设定的限制范围。
	def get_settable_quotas(self, context, resources, project_id, user_id=None):
	#确定某个限额是否超标。
	def limit_check(self, context, resources, values, project_id=None, user_id=None):
	#确定在限额范围内分配资源，实现限额请求的事物处理。
	def reserve(self, context, resources, deltas, expire=None, project_id=None, user_id=None):
	def commit(self, context, reservations, project_id=None, user_id=None):
	def rollback(self, context, reservations, project_id=None, user_id=None):
	#清除project、user的限额信息，使用信息。
	def destroy_all_by_project_and_user(self, context, project_id, user_id):
	def destroy_all_by_project(self, context, project_id):
	#清空由某个用户产生的使用信息。
	def usage_reset(self, context, resources):
	#放弃所有长期没有被处理的限额请求。
	def expire(self, context):
### 多种资源自适应
限额驱动会先判断资源类型，然后使用合适的方法计算、占用资源。
### 事物逻辑
相比直接存取数据，限额驱动提供的最有意义的功能就是提供了一个可回滚的事务逻辑。不过目前的代码里，事物逻辑仅限于以project为单位的资源（我想因为只有它才存在并发冲突的问题吧）。
调用reserve方法时，能够取得一些带过期时间的reservation，这些reservation能够被提交和回滚和清理。

引擎
----
引擎几乎是驱动方法的一一映射，这个我不太理解为什么要有这么一层抽象，大概可能是：引擎是对外部提供的直接接口，而驱动和资源的接口会根据需求在内部调整。
这层额外的接口抽象利弊问题，我个人觉得是有待商榷的。

其他
----
在限额的细节设计上，我有一些不理解。例如为什么OpenStack限额的功能是在Nova实现，而用户的管理在KeyStone实现，那么Glance模块需要限额管理该如何是好，找不到相关说明，这可能是个历史问题。
