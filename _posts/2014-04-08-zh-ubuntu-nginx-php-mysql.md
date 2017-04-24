---
layout: post
title: 记一次配置高并发 UBUNTU、NGINX、PHP、MYSQL
---

## 操作系统

### 文件描述符
文件描述符可以看作是 Linux 的 IO 句柄，默认限制在 1024 个活动描述符。

	vim /ect/pam.d/common-session
		session required pam_limits.so
	vim /etc/security/limits.conf
		* hard nofile 65536
		* soft nofile 65536
	vim /etc/profile
		ulimit -SHn 65536
		
(理论上前两部即可，实际无效，所以加了第三部步，无效原因未知）
我不了解内核的实现，我猜测是会有跟定长数组维护这个描述符列表。对长度做限制，可能降低了某些操作的时间。
### 网络连接数
说实话，对这个参数我并不了解，先放在这里。
	echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
	echo 'net.core.netdev_max_backlog = 65536' >> /etc/sysctl.conf
	sysctl -p

## NGINX

	apt-get install nginx
	vim nginx.conf
		worker_processes 4;
		worker_rlimit_nofile 65536;
		# pid /dev/shm/nginx.pid;
		events {
			worker_connections 8192;
			# use epoll;
			# multi_accept on;
		}

worker_processes，理论上没必要超过操作系统所识别的 CPU 核数。NGINX 超高并发的重要基础就是使用了事件模型，而不是传统的进程线程池，一般来说，就算是 1 也不应该是瓶颈。
worker_rlimit_nofile 每个 processes 打开的文件描述符限制。。。
有人提议把 nginx pid 放进内存，我觉得他吃饱了撑着。
`use epoll` 也不需要加，符合条件，会自动选择 epoll。
`multi_accept on` 就属于看心情了。。。系统撑得住就行，可以有效提高高并发下，连接的响应速度。
配个网站我就不罗嗦了。

	server {
		server_name www.yangyuan.info;
		root /usr/share/nginx/www/yangyuan/;
		index index.html index.php;
		location ~ \.php$ {
			fastcgi_split_path_info ^(.+\.php)(/.+)$;
			fastcgi_pass unix:/dev/shm/php5-fpm.sock;
			fastcgi_index index.php;
			include fastcgi_params;
		}
	}
	server {
	    server_name yangyuan.com;    
	    rewrite ^ http://www.yangyuan.com$request_uri? redirect; 
	}
	
不过我习惯建立个 `fastcgi_php_params`，然后 `include fastcgi_php_params`

	index index.html index.php;
	location ~ \.php$ {
		fastcgi_split_path_info ^(.+\.php)(/.+)$;
		fastcgi_pass unix:/dev/shm/php5-fpm.sock;
		fastcgi_index index.php;
		include fastcgi_params;
	}

## Install PHP

	apt-get install php5-fpm
	vim pool.d/www.conf
		;listen = 127.0.0.1:9000
		listen = /dev/shm/php5-fpm.sock
		rlimit_files = 65536
		pm.max_requests = 1024

进程策略就看服务器情况来了

	pm.max_children = 128
	pm.start_servers = 24
	pm.min_spare_servers = 16
	pm.max_spare_servers = 32
	
如今 APC 的代码缓存已经被内置在 PHP 里了，APC 项目只有 APCU 有使用价值。我对比过 APCU 和 MEMCACHE，APCU 毕竟是内置的，少量缓存有绝对优势。

	apt-get install php-apc
	extension=apc.so
	apc.shm_size = 256M
	apc.slam_defense = 0

## MYSQL

MYSQL 虽然可以配置到服务器极限，但是极度不推荐。MYSQL 并不智能，不当的配置容易出现宕机，甚至数据损坏。
我不是 MYSQL 专家，数据库主要用的也就是 MYSQL 和 MSSQL（偶尔用其他的，但是并不熟悉）。在我看来 MYSQL 和 MSSQL 一大区别就是配置上，MYSQL 要相当小心谨慎，一不小心就搞的要死要活。

	vim my.cfg
		bind-address		= 0.0.0.0
		max_connection = 1024
		
		key_buffer		= 32M
		innodb_buffer_pool_size = 1024M
		innodb_log_file_size = 128M
		
		query_cache_limit	= 4M
		query_cache_size        = 32M
		expire_logs_days	= 8
		max_binlog_size         = 128M
		
		read_rnd_buffer_size = 32M
		table_open_cache = 1024
		max_heap_table_size = 128M
		tmp_table_size = 256M
		max_length_for_sort_data = 65536
		sort_buffer_size = 32M
	
max_connection 不能过高，一个 connection 都会占有独立的内存空间，貌似至少 4MB，内存够吗？
innodb 的两个重要参数 innodb_buffer_pool_size、innodb_log_file_size 根据内存来，/var/lib/mysql/ 的两个文件，是跟 innodb_log_file_size 一致的，调整需要手动删除。
key_buffer 也就是 key_buffer_size 是 myisam 的核心参数，就算不主动使用 myisam 表，内置表、内存表、临时表都是 myisam 的，因此这个数值可以考虑提高。
其他参数就属于看情况了，一般调整数据库表设计远比调整 MySQL 参数重要。
