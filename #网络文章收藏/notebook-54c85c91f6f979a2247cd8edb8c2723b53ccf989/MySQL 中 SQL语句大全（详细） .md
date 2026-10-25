 

1. 基本概念
数据库的概念
1）结构化查询语言（Structured Query Language）简称SQL；
2）数据库管理系统（Database Management System）简称DBMS；
3）数据库管理员（Database Administration）简称DBA，功能是确保DBMS的正常高效运行；

SQL常用的3个部分
1）数据查询语言（DQL）：其语句也称“数据库检索语句”，用以从表中获得数据，保留字SELECT经常使用，DQL也是所有SQL中用的最多的，其他保留字还有WHERE, ORDER BY, GROUP BY和HAVING这些保留字还与DML一起使用；
2）数据操作语言（DML）：其余局包括动词INSERT，UPDATE和DELETE。他们分别用于添加，修改和删除表中的行。也称动作语言；
3）数据定义语言（DDL）：DDL主要用于操作数据库。

2. SQL列的常用类型
MySQL:           |         Java:
INT              |         int
BIGINT           |         long
DECIMAL          |         BigDecimal
DATE/DATETIME    |         java.util.Date
VARCHAR          |         String
3. DDL简单操作
3.1 数据库操作
连接数据库语句
mysql -uroot -padmin;
查看数据库列表：
show databases
创建数据库
create database 数据库名称;
删除数据库
drop database 数据库名称;；
修改数据库（alter databese）
# 修改数据库编码格式
alter database 数据库名称 charset=编码格式;
查看当前数据库下所有数据表
show tables;
3.2 表操作
表的约束
1）非空约束：NOT NULL，不允许某列的内容为空；
2）设置列的默认值：DEFAULT；
3）唯一约束：UNIQUE，该表中，该列的内容必须唯一；
4）主键约束：PRIMARY KEY，非空且唯一；
5）主键自增长：AUTO_INCREMENT，从1开始，步长为1；
6）外键约束：FOREIGN KEY，A表中的外键列。A表中的外键列的值必须参照于B表中的某一列（B表主键）。

建表
1）建表语法：

列名1  列的类型  [约束],
列名2  列的类型  [约束],
...
列名N  列的类型  [约束]
);
// 注意：最后一行没有逗号
例子：建立一个学生表（t_student) 字段有 id name email age
注意：建表不要使用关键字

## 如果表存在就移除，因为不能存在两个一样名称的表
DROP TABLE IF EXISTS 't_student';
CREATE TABLE t_student(
  id    BIGINT          PRIMARY KEY AUTO_INCREMENT,
  name  VARCHAR(25)     UNIQUE,
  email VARCHAR(25)     NOT NULL,
  age   INT             DEFAULT  17
  );
删除表
1）删表语法：
DROP TABLE 表名;
4. DML操作
4.1 修改操作（UPDATE SET）
语法
UPDATE 表名
SET 列1 = 值1, 列2 = 值2, ...
WHERE [条件]
实战
// 1、将张三改为独孤求败
UPDATE t_student SET name="独孤求败" WHERE name="张三";
注意：不要省略where条件子句，省略的话，全表数据都会被修改。

4.2 插入操作（INSERT INTO VALUE）
语法
INSERT INTO 表名 (列1，列2，...) VALUE (值1，值2，...);
实战
// 1、插入完整数据记录
INSERT INTO t_student (name, email, age) VALUE ("xiaoming", "xiao@qq.com", 16);
// 2、插入部分数据记录
INSERT INTO t_student (name, age) VALUE ("xiaoming", 16);
// 3、插入查询结果
INSERT INTO t_student(name, email, age) SELECT name,email,age FROM t_student;
4.3 删除操作（DELETE）
语法
DELETE FROM 表名 WHERE [条件]
实战
// 删除 id 为 2 的学生信息
DELETE FROM t_student WHERE id = 2;
注意：Where子句别省略，否则全表的数据都会被删除。

5. DQL操作
被操作的表
[外链图片转存失败,源站可能有防盗链机制,建议将图片保存下来直接上传(img-nHwzFGoU-1618309993623)(https://img2020.cnblogs.com/blog/2310524/202104/2310524-20210413165743724- .png)]

5.1 消除重复元素（DISTINCT）
语法：
SELECT DISTINCT 列名, ... FROM 表名;
注意：distinct 放在2个字段前，是2个字段组合后重复才去重，放在第一个后会报错

实战：
SELECT DISTINCT productName, brand FROM product;
5.2 算术运算符（+，-，*，/）
算术运算符的使用范围
1）对 number 型数据可以使用算术运算符（+，-，*，/）对数据进行操作；对date型数据可以使用部分算术运算符（+，-）对数据进行操作。

算术运算符的优先级
1）与数学中运算相同

实战

// 查询所有货物的id，名称和批发价（折扣价=销售价*折扣）
SELECT id, productName, salePrice * disCount From product;
5.3 设置别名（AS）
作用
1）改变列的标题头；
2）作为计算结果的含义；
3）作为列的别名；
4）如果别名使用特殊字符（强烈不建议使用特殊字符），或是强制大小写或有空格时都需要加单引号。

语法

// 第一种
SELECT 列名 AS 别名 FROM 表名 [WHERE];
// 第二种
SELECT 列名 别名 FROM 表名 [WHERE];
实战
// 查询所有货物的id，名称和折扣价价（折扣价=销售价*折扣）(使用别名）
SELECT id, productName, salePrice * disCount AS price From product;
5.4 按格式输出（CONCAT）
1）为了方便用户浏览查询结果数据，有时需要设置查询结果的显示格式，可以使用CONCAT函数来连接字符串。

语法
CONCAT(字符串1, 字符串2, ...)
实战
// 查询商品的名字和零售价。格式：xxx商品的零售价为：ooo
SELECT CONCAT(productName, " 商品的零售价为：", salePrice) FROM product;
5.5 过滤查询（WHERE）
1）使用WHERE子句限定返回的记录。

语法
SELECT <selectList> FROM 表名 WHERE 条件;
注意：WHERE子句在FROM子句之后。

5.6 比较运算符（=, >, >=, <, <=, !=）
1）不等于：<> 等价 !=；

实战
// 查询商品名为 罗技G9X 的货品信息
SELECT * FROM product WHERE productName = "罗技G9X";
// 查询批发价大于350的货品信息（折扣价 = 销售价*折扣）
SELECT *, salePrice * discount FROM product WHERE salePrice * discount > 350;
5.7 逻辑运算符（AND、OR、NOT）
1）AND：如果组合的田间都是 true，返回true；
2）OR：如果组合的条件之一是true，返回true；
3）NOT：如果给出的条件是false，返回true；如果给出的条件是true，则返回false。

实战
// 查询售价在300-400（包括300和400）的货品信息
SELECT * FROM product WHERE salePrice >= 300 ADN salePrice <= 400;
// 查询分类编号为2, 4的所有货品信息
SELECT * FROM product WHERE dir_id = 2 OR dir_id = 4;
// 查询编号不为2的所有商品信息
SELECT * FROM product WHERE NOT dir_id = 2
5.8 范围和集合（BETWEEN AND）
1）范围匹配：BETWEEN AND 运算符，一般使用在数字类型的范围上。但对于字符数据和日期类型同样可用。
注意：BETWEE AND 使用的是闭区间。

语法
// 使用的是闭区间，也就是包括minValue 和 maxValue
WHERE 列名 BETWEEN minValue AND maxValue;
实战
// 查询零售价不在 300 - 400 之间的货品信息
SELECT * FROM product WHERE NOT salePrice BETWEEN 300 AND 400;
2）集合查询：使用 IN 运算符，判断列的值是否在指定的集合中。

语法
WHERE 列名 IN (值1, 值2, ...);
实战
// 查询分类编号为 2，4 的所有货品的 id，货品名称
SELECT id, productName FROM product WHERE dir_id IN (2,4);
// 查询分类编号不为 2, 4 的所有货品的 id，货品名称
SELECT id, dir_id, productName FROM product WHERE NOT dir_id IN (2,4);
5.9 判空（IS NULL)
1）IS NULL：判断列的值是否为空值，非空字符串，空字符串使用 == 判断；

语法
WHERE 列名 IS NULL;
实战
// 查询商品名为NULL的所有商品信息
SELECT * FROM product WHERE productName IS NULL;
SELECT * FROM product WHERE supplier = "";
结论：使用 = 来判断只能判断空字符串，不能判断 null；而使用 IS NULL 只能判断 null 值，不能判断空字符串。

5.10 模糊匹配查询（LIKE，%，_）
1）LIKE：模糊查询数据使用 LIKE 运算执行通配符；
2）通配符：% 表示可有零个或多个任意字符; _ 便是需要一个任意字符；

语法
WHERE 列名 LIKE "%M_";
实战
// 查询货品名称以 罗技M9* 结尾的所有货品信息，这里的 * 表示一个任意字符，它不具备任何意义，只是我出于题目需要才这样写，便于你理解而已
SELECT * FROM product WHERE productName LIKE "%罗技M9_";
5.11 结果排序（ORDER BY）
1）ORDER BY：使用 ORDER BY子句将查询结果进行排序，ORDER BY子句出现在 SELECT 语句的最后；
2）ASC：升序；DESC：降序；

实战
// 查询 id，货品名称，分类编号，零售价 按分类编号降序排序，如果分类编号相同再按零售价升序排序
SELECT * FROM product ORDER BY dir_id DESC, salePrice ASC;
5.12 DQL字句的执行顺序
1）FROM字句：从哪张表中去查数据；
2）WHERE字句：筛选需要的行数据；
3）SELECT字句：筛选需要显示的列数据；（对字段 AS 起别名是在这时候，所以 WHERE 中不能用字段的别名，ORDER BY 中可以使用别名）
4）ORDER BY字句：排序操作。

6. 统计函数
常用关键字(COUNT、SUM、MAX、MIN、AVG）
概念
1）COUNT(*)：统计表中有多少条数据；
2）SUM(列)：汇总列的总和；
3）MAX(列)：获取某一列的最大值；
4）MIN(列)：获取某一列的最小值；
5）AVG(列)：获取某一列的平均值；

实战

// 查询货品表共有多少数据
SELECT COUNT(*) FROM product;
// 计算所有货品的销售价
SELECT SUM(costPrice) FROM product;
总结
以上就是对 MYSQL的 SQL 语句的总结了，代码仅供参考，欢迎讨论交流。
