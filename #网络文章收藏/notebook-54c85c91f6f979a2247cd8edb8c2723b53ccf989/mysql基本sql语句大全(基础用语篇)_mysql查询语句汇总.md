 大家好，又见面了，我是你们的朋友全栈君。

1.数据库存储引擎

mysql> show variables like ‘%storage_engine%’; #查看mysql当前默认的存储引擎

mysql> show engines; #查看存储引擎


InnoDB存储引擎:默认引擎，最常用的。

InnoDB是事务型数据库的首选引擎，支持事务安全表(ACID)，支持行锁定和外键;InnoDB是默认的

MySQL引擎 InnoDB特点： 支持事务处理，支持外键，支持崩溃修复和并发控制。如果需要对事务的完整性要求比较高(比如银行)，要求实现并发控制(比如售票)，那选择InnoDB有很大的优势。如果需要频繁的更新、删除操作的数据库，也可以选择InnoDB，因为支持事务的提交(commit)和回滚(rollback)。

默认的是InnoDB，但有时候我们需要使用其它引擎该怎么办？

mysql> create table t1(字段名,类型) engine=引擎; #创建的时候指定你想要的引擎

#如果你创建表的时候忘了指定引擎了，那它使用的就是默认的InnoDB，当然我们也可以修改引擎

mysql> ALTER TABLE 表名 ENGINE=引擎; #将该表修改指定为你想要使用的引擎

注意：在Mysql中，指令不分大小写，但是库名，表名之类的不属于与指令的是区分大小写的。

2.增删改查

1.创建库

mysql> create database 库名;

2.查看数据库中的所有库

mysql> show databases;

3.进入数据库

mysql> use 库名;

4.查看当前所在的库

mysql> select database();

创建表

必须先使用mysql> use 库名;语句进入某个库中，才能创建表

语法:

create table 表名(

字段名1 类型[(宽度) 约束条件],

字段名2 类型[(宽度) 约束条件],

字段名3 类型[(宽度) 约束条件]

)[存储引擎 字符集];

==在同一张表中，字段名是不能相同

==宽度和约束条件可选

==字段名和类型是必须的

=========================================================

1.创建表：

mysql> create table t1(id int, name varchar(20), age int);

字段 类型 字段 类型(长度)， 字段 类型

2.查看有哪些表

mysql> show tables;

3.查看表结构：

mysql> desc 表名;

4.查看表里面的所有记录:

语法: select 内容 from 表名；

mysql> select * from t1;

*:代表所有内容

5.查看表里面的指定字段：

语法:select 字段，字段 from 表名；(可以查一个字段，也可以是多个，中间用逗号隔开)

mysql> select name,age from t1;

6.查看表的状态

mysql> show table status like ‘表名’\G

#\G表示查看的内容会一条记录一条记录显示。用的\G就不用添加分号了

7.修改表名称

方式一、语法:rename table 旧表名 to 新表名;

mysql> rename table t1 to t2;

Query OK, 0 rows affected (0.00 sec)

方式二、语法:alter table 旧表名 rename 新表名;

mysql> alter table t2 rename t3;

8.使用edit(\e)编辑——了解

mysql> \e #可以写新的语句，调用的vim编辑器，在里面结尾的时候不加分号，保存退出之后在加“;”

-> ;

9.删除表

mysql> drop table 表名;

10.删除库

mysql> drop database 库名;

3.约束

常见的约束条件

不分大小写：

PRIMARY KEY (PK) 标识该字段为该表的主键，可以唯一的标识记录，不可以为空 UNIQUE + NOT NULL

FOREIGN KEY (FK) 标识该字段为该表的外键，实现表与表(父表主键/子表1外键/子表2外键)之间的关联

NULL 标识是否允许为空，默认为NULL。

NOT NULL 标识该字段不能为空，可以修改。

UNIQUE KEY (UK) 标识该字段的值是唯一的，可以为空，一个表中可以有多个UNIQUE KEY

AUTO_INCREMENT 标识该字段的值自动增长(整数类型，而且为主键)

DEFAULT 为该字段设置默认值

UNSIGNED 无符号，正数

1.主键

每张表里只能有一个主键，不能为空，而且唯一。

定义两种方式：

mysql> create table 表名(字段1 类型 primary key,字段2 类型); #在字段1的类型后面定义

mysql> create table 表名(字段1 类型,字段2 类型,primary key(字段1));# 在最后定义，并指定哪个字段

删除主键

mysql> alter table 表名 drop primary key;

2.索引

索引：当查询速度过慢可以通过建立优化查询速度，可以当作调优

index(key)每张表可以有很多列做index

创建索引：两种

mysql> create table 表名(字段1 类型 primary key,字段2 类型,index (字段2));

mysql> create table 表名(字段1 类型 primary key,字段2 类型,index 别名(字段2));

#给字段2做的索引并起别名

3.自增

auto_increment——–自增 (每张表只能有一个字段为自曾) (成了key才可以自动增长)

mysql> CREATE TABLE 表名 (

-> 字段1 类型 PRIMARY KEY AUTO_INCREMENT,

-> 字段2 类型,

-> 字段3 类型

-> );

4.表操作

1.添加新字段

alter table 表名 add 字段 修饰符;

mysql> alter table 表名 add 字段名 类型;#添加的字段

mysql> alter table 表名 add (字段1 类型,字段2 类型);#添加多个字段,中间用逗号隔开。

alter table 表名 add 添加的字段(和修饰) after name; #把添加的字段放到name后面

alter table 表名 add 添加的字段(和修饰) first; #把添加的字段放在第一个

2.修改名称、数据类型、修饰符

alter table 表名 change 旧字段 新字段 修饰符; #change修改字段名称，类型，约束，顺序

mysql> alter table 表名 change 旧字段 新字段 类型 after 字段1; #修改字段名称与修饰并放在字段1后面

3.修改字段类型，约束，顺序

alter table 表名 modify 字段 类型 修饰符； #modify 不能修改字段名称

mysql> alter table 表名 modify 字段 类型 after 字段名; #修改修饰并更换位置

4.删除字段

mysql> alter table 表名 drop 字段名; #drop 丢弃的字段。

插入数据

字符串必须引号引起来

记录与表头相对应，表头与字段用逗号隔开。

1.添加一条记录

insert into 表名(字段1,字段2,字段3,字段4) values(1,”yjssjm”,”man”,90);

注:添加的记录与表头要对应，

2.添加多条记录

mysql> insert into 表名(字段1,字段2,字段3,字段4) values(2,”yjssjm”,”woman”,19),

(3,”xiaoming”,”man”,20);

3.用set添加记录

mysql> insert into 表名 set 字段1=值1,字段2=值2,字段3=值3,字段4=值4;

4.更新记录

update 表名 set 修改的字段 where 给谁修改;

mysql> update 表名 set 字段1=值 where 字段2=值;

5.删除记录

1.删除单条记录

mysql> delete from 表名 where 字段1=值; #删除那个记录，等于几会删除那个整条记录

2.删除所有记录

mysql> delete from 表名;

5.权限管理

1. 登录和退出MySQL

远程登陆：

客户端语法：mysql -u 用户名 -p 密码 -h ip地址 -P端口号:如果没有改端口号就不用-P指

定端口

# mysql -hip地址 -P 3306 -uroot -p’密码’

# mysql -hip地址 -P 3306 -uroot -p’密码’ -e ‘show databases;’

-h 指定主机名 【默认为localhost】

-P MySQL服务器端口 【默认3306】

-u 指定用户名 【默认root】

-p 指定登录密码 【默认为空密码】

-e 接SQL语句，可以写多条拿;隔开

# mysql -hip地址 -P 3306 -uroot -p’密码’ -D mysql -e ‘show databases;’

此处 -D mysql为指定登录的数据库

2.创建表

mysql> create user tom@’localhost’ identified by ‘密码’; #创建用户为tom，并设置密码。

mysql> FLUSH PRIVILEGES; #更新授权表

注:

identified by ：设置密码

在用户tom@’ ‘ 这里 选择:

%：允许远程登陆。也可以指定某个ip，允许某个ip登陆。也可以是一个网段。

%：包括所有的主机，不包括本机(127.0.0.1)，但是不包括(localhost)

==客户端主机 % 所有主机

192.168.13.% 192.168.13.0网段的所有主机

192.168.13.252 指定主机 192.168.13.252

localhost 指定主机本机

3.使用命令授权：grant

也可创建新账户(不过后面的版本会移除这个功能，建议使用create user)

语法格式：

grant 权限列表 on 库名.表名 to ‘用户名’@’客户端主机’ IDENTIFIED BY ‘Qf@123’；

==权限列表 all 所有权限(不包括授权权限)

select,update

select, insert

==数据库.表名 *.* 所有库下的所有表 Global level

web.* web库下的所有表 Database level

web.stu_info web库下的stu_info表 Table level

给刚才创建的用户tom授权：

mysql> grant select,insert on *.* to ‘tom’@’localhost’;

mysql> FLUSH PRIVILEGES;

4.删除用户

方法一：DROP USER语句删除

DROP USER ‘用户名’@’localhost’;

方法二：DELETE语句删除

DELETE FROM mysql.user WHERE user=’tom’ AND host=’localhost’;

更新授权表： FLUSH PRIVILEGES;
