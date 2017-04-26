---
layout: post
title: OSLO PROTOTYPE：一个 OpenStack 项目模板
---

输入法写累了，写几天 OpenStack，源码开放于 [url]https://github.com/yangyuan/oslo.prototype[/url]。
我自己觉得是一个挺好的东西，官方还未提供，就算提供了，用起来也应该不会这么便捷把。。。把。。。

OSLO
----
最早接触 OpenStack 的时候，就被各种 common.openstack 和 openstack.common 搞的恶心，每个项目都包含，因为分离时间不一致，命名类一样，用法却不一样。后来听说有了 oslo，果然很好用，现在的 master 上都大量使用 oslo，代码立马轻巧了很多。
oslo.prototype 跟 oslo 没啥关系，只是思路是一样的，就是把 OpenStack 项目中共性的部分抽出来，当然 oslo.prototype 也尽量使用 oslo。
### openstack-common
oslo 包大多数是无状态的 Python 类库，有些任务虽然通用，但是因为工作量大或者需求不稳定，还没有放进 oslo 库。目前这些代码都以 openstack-common 的形式存在，而这些整理之后的代码，都可以在 oslo-incubator（[url]https://github.com/openstack/oslo-incubator[/url]）项目里找到。
Prototype 优先使用 oslo 代码，其次使用 openstack-common，再其次才自己实现。


Prototype
----
我在完成 Navigator 的时候，之前老板就提出来要不要做个教程，叫 “教你一步步开发 OpenStack 新模块”，或者把 Navigator 做成项目模板，当时我觉得不行，因为 Navigator 代码是为 ZeStack 设计的，结构啊安装方式啊是跟 ZeStack 的一样的，跟 OpenStack 官方模块还是有差距的。前段时间重构 Navigator，就像干脆了结这个心愿好了，做一个 OpenStack 的项目模板，这就是 Prototype。
Prototype 最初是从 2014.2.1 的 Nova 和 Glance 中分离出的，后来也顺应同步到比较新的版本，目前可以认为是跟 master 分支一致。


PENDING。。。有空再填坑
----


使用方法
----
### 快速试用
准备代码
	git clone oslo.prototype
安装依赖
	pip install -r requirements.txt or easy_install
配置临时 PTH（避免代码安装）
	echo "/???/oslo.prototype/prototype" > /usr/lib/python2.7/dist-packages/prototype.pth
	echo "/???/oslo.prototype/python-prototypeclient" > /usr/lib/python2.7/dist-packages/prototypeclient.pth
配置
	vim /???/oslo.prototype/etc/prototype/prototype.conf # mysql, rabbitmq, keystone
同步数据库
	./bin/manage db_sync
运行 API
	./bin/api --config-file etc/prototype/prototype.conf
运行服务进程
	./bin/worker --config-file etc/prototype/prototype.conf
测试 SDK
	./bin/client
测试命令行
	./bin/cli --os-username admin --os-password admin --os-tenant-name admin --os-auth-url http://localhost:35357/v2.0 --os-prototype-url http://127.0.0.1:8787/v1 sample-debug --param=sampleparam

### 创建项目
1、下载 Prototype 源码。
2、批量替换 prototype 到 yourproject，Prototype 到 YourProject，PROTOTYPE 到 YOURPROJECT，包括文件名。
3、开发、测试、发布。

### 正式安装
python setup.py install
修改 /etc 下配置文件
支持 devstack

细节：整体
----
Nova、Glance 代码并非完美（或并不适合二次开发），Prototype 在部分地方有针对性的改进。
### 代码风格
OpenStack 包含多种迥异的代码风格，这点在 Nova 中表现相当严重。
在 API、数据库等需要二次开发的地方，Prototype 参考了 Nova 和 Glance，选取并保持采用统一的命名方式。
对于个别明显包装过度的类，有进行局部简化。
### 可读性
由于历史原因，Nova 和 Glance 中存在大量被弃用的代码，这些代码留存在项目里反而不利于分析理解，在确定无用的情况下，Prototype 移除了一部分过时代码。
对一些写死的地方（如 Service 里的部分逻辑），Prototype 综合多个项目的设计进行了统一化处理，保留通用部分。
### 包依赖
Prototype 全程避免引入新依赖，Prototype 的依赖保持为 KeyStone 依赖的子集，并且尽量放宽版本要求。

细节：API
----
细节：Service
----
目前还没有 oslo.service 这种东西（希望很快有），不同模块，在 Service 的实现上是有很大差异的。但一般都有个 service.py 里面除了有几个 service 基础类以外，还包含了一些 service 配置，一些 service 业务逻辑，甚至数据库逻辑和 hardcode。（这文件的写法我真是服了，既复杂，又耦合，估计是历史原因写成这样），这个问题在 Nova 在引入了 Conductor、ServiceGroup 什么的之后显得更严重。
我在实现上尽量使用 Nova 代码精简，精简的程度参考了 Neutron，我其实觉得 Neutron 的写法更好，但怕引起代码风格突变什么的，所以还是用的 Nova 代码。
 
细节：DB
----
### 基本操作
### 版本管理

细节：Python Client
----
Python Client 可以认为由两部分组成，一部分用于处理命令行，一部分处理代码调用。
Python Client 的实现，对第三方模块并不十分友好，OpenStack 计划使用 python-openstackclient 替代所有 client，目前已经有一部分模块将 Shell 部分转移到 openstackclient 上。
### Client 类
Client 算是入口类，通常需要给 Client 传入一些参数，比如用户名密码，或者token。Client 一般也包含了利用用户名密码自己去 Keystone 获取 token 的功能。
### 版本管理
如果 Client 有多个版本，通常会有个入口 Client，并且会根据参数决定范围那个具体版本的 Client。
通常来说，
### Manager 类
Manager 类包含了具体的函数到 URL 的映射。
openstack.common.apiclient.base 含有几个基础的 Manager 实现。
一般来说 Manager 会尝试把 API 返回的字符串转化为一个 Resource 类，如果 API 返回的不是一个合格的 Resource 类 json 串，就需要做特殊处理。
### Shell 实现
Shell 主要供命令行使用，利用调用 Client，实现操作，并且显示在终端上。Shell 也包含了一些验证工作的实现，比如跟你要用户名密码处理。

细节：OSLO
----
### incubator
oslo-incubator 包含了 openstack.common 原始代码，下载 oslo-incubator 后利用 update.sh 可以生成自己项目所需的 openstack.common 代码。
OpenStack 的大体思路是，先把比较 common 的代码放进 oslo-incubator，再把 oslo-incubator 里的部分代码分离出 oslo 包，并存一段时间之后，从 oslo-incubator 删除。
### logging
oslo_log.log 可看成是原来的 openstack.common.log。
oslo_log._i18n 可看成是原来的 openstack.common._i18n 的 log 部分。
oslo_log.__init__ 目前空缺
WritableLogger 放置在 oslo_log.loggers
setup 之前需要先执行 oslo_log.log.register_options(conf)，然后 oslo_log.log.setup(conf, "prototype")
audit 被移除。
### i18n
i18n 可以认为是原 gettextutils 和 _i18n 的替代品。
i18n TranslatorFactory 的初始化需要指定一个 domain，i18n 会根据这个 domain 寻找环境变量里对应的 _LOCALEDIR，如果没有指定，那么则使用 /usr/share/locale 下的参数。
i18n._i18n 是使用 'oslo.i18n' 这个 domain，不应该被外部使用。
一般来说需要需要自己封装 i18n，以实现 _(), _LE() 等操作。
### messaging

### policy、rootwarp
这些功能目前 Prototype 不提供，会待对应 oslo 库稳定后，在今后版本提供。
