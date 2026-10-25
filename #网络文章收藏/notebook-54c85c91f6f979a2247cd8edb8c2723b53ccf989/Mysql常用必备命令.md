 这篇文章主要介绍了MySQL的常用命令集锦,堪称初学者需要掌握的MYSQL命令大全,其中系统命令行环境是基于类Unix系统来作例子的,需要的朋友可以参考下

MYSQL常用命令（必备）

1）导出test_db数据库

命令：mysqldump -u 用户名 -p 数据库名 > 导出的文件名

mysqldump -u root -p test_db > test_db.sql

1.1）导出所有数据库

mysqldump -u root -p –all-databases > mysql_all.sql

2）导出一个表

命令：mysqldump -u 用户名 -p 数据库名 表名> 导出的文件名

mysqldump -u root -p test_db test1 > test_test1.sql

3）导出一个数据库结构

mysqldump -u root -p -d --add-drop-table test_db > test.sql

-d 没有数据 --add-drop-table 在每个create语句之前增加一个drop table

4）导入数据库

①常用source命令

进入mysql数据库控制台，

如mysql -u root -p

然后使用source命令，后面参数为脚本文件(如这里用到的.sql)

mysql>source wcnc_db.sql

②使用mysqldump命令

mysqldump -u username -p dbname < filename.sql

③使用mysql命令

mysql -u username -p -D dbname < filename.sql

5）mysql进入与退出

进入：

mysql -uroot -p     //进入mysql控制台

mysql -uroot -p password     //进入mysql控制台

mysql -p                //进入mysql控制台

退出：

quit或exit

6）数据库操作

1、创建数据库

命令：create database <数据库名>

例如：建立一个名为test_db的数据库

mysql> create database test_db;

2、显示所有的数据库

命令：show databases （注意：最后有个s）

mysql> show databases;

3、删除数据库

命令：drop database <数据库名>

例如：删除名为 test_db的数据库

mysql> drop database test_db;

4、连接数据库

命令： use <数据库名>

例如：进入test_db数据库

mysql> use test_db;

屏幕提示：Database changed

5、查看当前使用的数据库

mysql> select database();

6、当前数据库包含的表信息

mysql> show tables; （注意：最后有个s）

7、查看数据库字符集

mysql> show variables like '%char%';

7）表操作，操作之前应连接某个数据库

1、建表

命令：create table <表名> ( <字段名1> <类型1> [,..<字段名n> <类型n>]);

例如：创建名为test01表，并创建两个字段，id、name、数据长度（用字符来定义长度单位）

mysql> create table test01 (id varchar(20),name varchar(20));

2、查看表结构

命令：desc 表名，或者show columns from 表名

例如：查看test表结构

mysql> desc test;

mysql> show columns from test;

mysql> describe test;

mysql> show create table test;

3、删除表

命令：drop table <表名>

例如：删除表名为test_db的表

mysql> drop table test_db;

4、插入数据

命令：insert into <表名> [( <字段名1>[,..<字段名n > ])] values ( 值1 )[, ( 值n )]

例如：往表test中插入二条记录, 这二条记录表示：编号为001，名字为yangxz

mysql> insert into test values ("001″,"yangxz");

5、查询表中的数据

1）查询所有行

命令： select <字段1，字段2，…> from < 表名 > where < 表达式 >

例如：查看表test中所有内容（数据）

mysql> select * from test;

例如：查找test表中id=001内容

mysql > select * from test where id=001;

例如：查找test表中已id为0开头的内容

mysql > select * from test where id like "0%";

2）查询前几行数据

例如：查看表test中前2行数据

mysql> select * from test order by id limit 0,2;

或者：

mysql> select * from test limit 0,2;

6、删除表中数据

命令：delete from 表名 where 表达式

例如：删除表test中编号为001的记录

mysql> delete from test where id=001;

7、修改表中数据

命令：update 表名 set 字段=新值,… where 条件

例如： 修改test表中name字段的内容

mysql> update test set name='admin' where id=002;

例如：修改test表中name字段的长度

mysql> alter table test modify column name varchar(30);

8、在表中增加字段

命令：alter table 表名 add字段 类型 其他; 

例如：在表test中添加了一个字段passtest，类型为int(4)，默认值为0 

mysql> alter table test add passtest int(4) default '0';

9、更改表名：

命令：rename table 原表名 to 新表名; 

例如：在表test名字更改为test1

mysql> rename table test to test1;

8）修改密码

mysqladmin -uroot -p旧密码 password 新密码

mysql> use mysql;

mysql> update mysql.user set password='新密码' where user='用户名';

mysql> flush privileges;

mysql> set password for 用户名@localhost=password('你的密码');

mysql> flush privileges;

9）增加用户

例如：增加一个test用户，密码为1234

mysql> insert into mysql.user(Host,User,Password) values("localhost","test",password("1234"));

mysql> flush privileges;

10）删除用户

例如：删除test用户

mysql> delete from user where user='test' and host='localhost';

mysql> flush privileges;

11）数据库授权

命令：grant 权限 on 数据库名.* to 用户名@localhost identified by '密码';

例如：授权test用户拥有test_db库的所有权限

grant all on test_db.* to test@localhost identified by '123456';

例如：授权test用户拥有test_db库的select,update权限

grant select,update on test_db.* to test@localhost;

12）锁表

mysql> flush tables with read lock;

解锁：

mysql> unlock tables;

13）查看当前用户

mysql > select user();

14）MYSQL密码破解方法

先停止Mysql服务，以跳过权限方式启动，命令如下：

service mysqld stop

/usr/local/mysql/bin/mysqld_safe –user=mysql –skip-grant-tables &

在shell终端输入mysql并按Enter键，进入mysql命令行

由于MYSQL用户及密码认证信息存放在mysql库中的user表，需进入mysql库

mysql> use mysql;

mysql> update user set password=password('123456') where user='root'；

mysql> flush privileges;

MYSQL root密码修改完，需停止以Mysql跳过权限表的启动进程，再以正常方式启动MYSQL，再次以新的密码登陆即可进入Mysql数据库

15）查看Mysql提供存储引擎

mysql > show engines;

查看mysql默认存储引擎

mysql> show variables like '%storage_engine%';

查看mysql系统版本

mysql> select version();

查看mysql库里所有表

mysql>show tables from mysql;

查看Mysql端口

mysql>show variables like 'port';

查看mysql库user表中user,host信息

mysql> select user,host from mysql.user; 
