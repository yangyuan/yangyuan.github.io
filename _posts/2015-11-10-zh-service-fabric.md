---
layout: post
title: Service Fabric
---

11 月正式加入 Azure Networking，第一个 Assignment 就跟 Service Fabric 相关。
鉴于是一个还在内测的产品，相信能分享一些有价值的东西。

https://azure.microsoft.com/en-us/documentation/services/service-fabric/

Service Fabric 的 SDK 在此，从 4.3 开始使用，到 5.0 GA。一路看到 Service Fabric 的改进。尤其是在 4.3，4.4 的时候，发现了其在存储方面的 BUG，跟 Service Fabric 的开发人员一起分析讨论 BUG 产生的原因，最终在 4.5 版本中得到解决，成就感非常丰富。

大白话介绍 Service Fabric
----
Service Fabric 定义了一套框架和 pattern。在这个框架里编程，最终的程序就可以在 Service Fabric 环境中执行，并且利用 Service Fabric 提供的方式实现高可用和Scale。

### 有状态和无状态 Stateful、Stateless
第一个概念就是“状态”了。说白了，状态就是一种内置存储，永久性的存储。
Service Fabric 会利用锁、同步等机制，保证大家访问的数据是一致的，并且不会丢失。
比如。。。不知道合适不合适：博客的文章。。总之那种在传统架构里你想放进数据库的那部分。

### 微服务 Micro-Service
Service Fabric 集群，一般来讲是有各种 Micro-Services 组成，（其实还有 Actor，适合不同场景）。
Micro-Services 要么是 Stateful 的，可以访问内置存储。要么是 Stateless 的，不可以直接访问内置存储，但可以任意 Scale。
Micro-Service 最终并不是一个单独的进程，或者说，不一定是。

### 一个典型的 Service Fabric 集群
如果使用 Service Fabric 搭建一个文章管理系统（当然是大材小用，但说如果嘛），大概可以是这样的结构。
一个 Stateful Service，利用内置存储存文章数据。
无数个 Stateless Services，提供 HTTP Server，以及网站逻辑。
Stateless Services 会去跟 Stateful Service 通讯，读取和写入数据。

### Services 之间通讯
SDK 提供一个 ServiceProxy 的 RPC 通讯方式，是基于 WCF 的，性能并不高。
可以自定义通讯方式或者选择 RPC 的框架。

### Service 对外提供服务
Service Fabric 并不内置这样的方案，但应该说，凡事使用 TCP 的协议，都是可以对外服务的。
如果想使用 HTTP、HTTPS 尤其是想使用 ASP.NET，OWIN 是最佳的方式。
啥是 Owin？！
http://www.asp.net/aspnet/overview/owin-and-katana/an-overview-of-project-katana

### 更新中