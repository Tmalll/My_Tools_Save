 常用命令

docker-compose up -d 执行默认的docker-compose.yml文件(-f可以指定文件)，按文件命令，逐步执行。-d表示后台执行
docker-compose images 返回编排的镜像列表
docker-compose ps 返回运行的容器列表
docker-compose down 停止运行的容器列表并删除容器
docker-compose down --rmi all 停止运行的容器列表并删除容器和删除镜像
 部署Spring Cloud微服务的案例

eureka-service的Dockerfile文件

代码语言：javascript
复制
FROM hub.c.163.com/library/java:openjdk-8
VOLUME /tmp
ADD /eureka-service.jar /app.jar
RUN bash -c 'touch /app.jar'
EXPOSE 10000
ENTRYPOINT ["java","-jar","/app.jar","-Djava.security.egd=file:/dev/./urandom -Dfile.encoding=UTF-8 -server -Xms64m -Xmx768m","--spring.profiles.active=default"]
config-service的Dockerfile文件

代码语言：javascript
复制
FROM hub.c.163.com/library/java:openjdk-8
VOLUME /tmp
ADD /config-service.jar /app.jar
RUN bash -c 'touch /app.jar'
EXPOSE 10001
ENTRYPOINT ["java","-jar","/app.jar","-Djava.security.egd=file:/dev/./urandom -Dfile.encoding=UTF-8 -server -Xms64m -Xmx768m","--spring.profiles.active=default"]
docker-compose.yml

代码语言：javascript
复制
version: '3'
services:
  eureka-service:
    image: eureka-service
    build:
      context: eureka-service
      dockerfile: Dockerfile
    ports:
      - "10000:10000"
    deploy:
      resources:
        limits:
          cpus: '0.4'
          memory: 768M
        reservations:
          cpus: '0.01'
          memory: 128M
  config-service:
    image: config-service
    build:
      context: config-service
      dockerfile: Dockerfile
    ports:
      - "10001:10001"
    deploy:
      resources:
        limits:
          cpus: '0.2'
          memory: 512M
        reservations:
          cpus: '0.01'
          memory: 64M
这里使用的openjdk-8，并使用docker-compose构建镜像

目录结构
 


我们可以把每次要部署的jar包等都放到git仓库，然后从服务器拉取下来，再用docker-compose统一编排部署

代码语言：javascript
复制
# 进入git拉取下来文件夹
cd docker_pro
# 统一编排
docker-compose up -d
这样服务就部署好了，如果需要更新服务程序，可以先删除掉，再重新构建(已存在的镜像不会重新构建)
