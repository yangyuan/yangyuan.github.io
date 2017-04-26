---
layout: post
title: 一段 Python 监测 HTTP 服务状态的脚本
---

一句话：当发现HTTP状态为502时，重启 php5-fpm。

原因：
----
适用这种需求的情况很多，特别是php依赖一些不靠谱的东西时，如“curl”。
对于我来说，NGINX + PHP-FPM 在服务器配置低，但并发很高的情况下会出现 php5-fpm hang住的情况，几年前我就发现了，一直没有解决，当然这存在一些条件，比如我对php5-fpm和nginx进行了大胆的配置，以满足充分利用系统资源的目的。结果呢，就是在不确定的情况下，会出现502，并且是永久性502，不会随着流量下降而恢复的那种，出现时间也不固定，有时候隔天出现，有时候几个月没问题。
于是写了这段脚本，一直运行，避免挂掉。

脚本
----
[!code=python]
	#!/usr/bin/env python
	
	import sys
	import httplib
	import time
	import subprocess
	import logging
	
	def check():
	    connection = httplib.HTTPConnection('127.0.0.1')
	    connection.request('GET', '/')
	    # 这个地方请求的是首页，也可以专门做个页面请求
	    response = connection.getresponse()
	    return response.status
	
	if __name__ == '__main__':
	
	    logging.basicConfig(format='%(asctime)s [%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S', filename='daemon.log', level=logging.DEBUG)
	    # 弄个一个日志，备查，参考了nginx的日志格式
	
	    try:
	        counter = 0
	        while True:
	            time.sleep(1)
	            # 查询间隔是1秒
	            status = check()
	            logging.debug(str(status))
	            if status == 200:
	                counter = 0
	                sys.stdout.write('.')
	                sys.stdout.flush()
	                # 注意这个地方需要 flush
	            if status == 502:
	                counter += 1
	                # 这个地方有个计数器，当15次502之后才会进行操作
	                if counter >= 15:
	                    print ''
	                    subprocess.call('service php5-fpm restart', shell=True)
	                    print 'done restart php5-fpm'
	                    logging.info('done restart php5-fpm')
	                    counter = 0
	                else:
	                    sys.stdout.write('*')
	                    sys.stdout.flush()
	    except KeyboardInterrupt:
	        # Ctrl+C
	        print ''
	        pass

为什么不？
----
### 为什么不用 crontab
crontab 也是一个很好的解决方案，但是我觉得这个脚本更自由一些。
