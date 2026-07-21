Ollama的安装和运行前面文章：

手把手包教包会！Ubuntu环境下轻松搞定Ollama大模型安装与运行

已经进行了详细介绍。

开始说说今天的重头戏：Dify，为什么我推荐这个软件呢？因为他对英文不好的用户非常友好，中文版。

接下来分两部分，如果项直奔主题开始安装可以划到第二部分。

第一部分：Dify简介

图片

Dify 是一个开源的高级语言模型（LLM）应用开发框架，集成了后端即服务（Backend as a Service, BaaS）和LLM运维（LLMOps）的先进理念。该平台为开发者提供了一个高效的环境，以快速构建和部署商业级的生成式人工智能（AI）解决方案。Dify 的设计理念是让非技术背景的参与者也能轻松定义AI应用和参与数据管理流程。

图片

Dify 内嵌了构建LLM应用所需的核心技术组件，包括对众多AI模型的广泛支持、用户友好的Prompt设计工具、先进的检索增强生成（Retrieval-Augmented Generation, RAG）引擎、稳定可靠的代理（Agent）架构、以及灵活的业务流程编排能力。此外，Dify 提供了一套直观的图形用户界面（GUI）和应用程序编程接口（API），极大地简化了开发过程，允许开发者将精力集中在创新思维和满足业务需求上。

图片

选择Dify 的理由何在？可以将LangChain等开发库比作基本的工具箱，提供基础工具如锤子和钉子。Dify 则提供了一个更为全面和高级的解决方案，类似于一套经过精心设计和严格测试的建筑脚手架，专为满足生产环境的需求而打造。

图片

Dify 的开源特性意味着它由一支专业的全职团队和活跃的社区共同维护和不断改进。用户可以基于任何选定的模型，自行部署类似于助手API（Assistants API）和生成式预训练变换器（GPTs）的功能。在保障灵活性和安全性的同时，用户对数据拥有完全的控制权，确保了数据的私密性和安全性。

图片

Dify 定位于什么功能？ Dify 是一个创新的AI应用孵化器，专为创业者和企业设计，以加速从概念到实现的转变。它支持快速迭代和验证，无论是在寻求风险投资的初期阶段，还是在赢得市场认可的关键时刻。Dify 已经助力数十个团队成功构建了MVP（最小可行产品），并完成了POC（概念验证），为他们的商业计划赢得了资金和客户的信任。

Dify 如何融入现有业务？ Dify 提供了一种无缝集成现有业务流程的方法，允许企业通过其RESTful API将LLM技术嵌入到现有的应用程序中。这种集成方式支持Prompt与业务逻辑的解耦，同时Dify的管理界面提供了数据监控、成本分析和用量跟踪功能，帮助企业持续优化其AI应用的性能和效率。

图片

Dify 在企业级应用中扮演的角色？ Dify 被视为企业级LLM基础设施的解决方案，已经被一些金融机构和大型互联网公司采用，作为其内部LLM服务的网关。这不仅加速了通用人工智能（GenAI）技术在企业内部的推广，还实现了对AI应用的集中管理和监管。

Dify 对技术爱好者的吸引力？ Dify 为技术爱好者提供了一个实验和探索LLM技术边界的平台。即使是初学者，也能通过Dify轻松实践Prompt工程和Agent技术。在GPTs等模型普及之前，Dify已经吸引了超过60,000名开发者在其平台上构建了他们的首个AI应用，这证明了Dify在降低技术门槛和促进创新方面的潜力。

图片

第二部分：Ubuntu 中安装 Dify

安装方法有两种：源码部署和Docker Compose部署，我在这里只讲最简单的一种：Docker Compose 部署。

前提条件（我只讲在Ubuntu平台下安装）
操作系统

软件

描述

Linux platforms

Docker 19.03 or later

Docker Compose 1.25.1 or later

请参阅安装 Docker 和安装 Docker Compose 以获取更多信息。

克隆 Dify 代码仓库
克隆 Dify 源代码至本地。

git clone https://github.com/langgenius/dify.git
启动 Dify
进入 Dify 源代码的 docker 目录，执行一键启动命令：

cd dify/docker
cp .env.example .env
docker compose up -d
如果您的系统安装了 Docker Compose V2 而不是 V1，请使用 docker compose 而不是 docker-compose。通过$ docker compose version检查这是否为情况。在这里阅读更多信息。

部署结果示例：

[+] Running 11/11
 ✔ Network docker_ssrf_proxy_network  Created                                                                 0.1s 
 ✔ Network docker_default             Created                                                                 0.0s 
 ✔ Container docker-redis-1           Started                                                                 2.4s 
 ✔ Container docker-ssrf_proxy-1      Started                                                                 2.8s 
 ✔ Container docker-sandbox-1         Started                                                                 2.7s 
 ✔ Container docker-web-1             Started                                                                 2.7s 
 ✔ Container docker-weaviate-1        Started                                                                 2.4s 
 ✔ Container docker-db-1              Started                                                                 2.7s 
 ✔ Container docker-api-1             Started                                                                 6.5s 
 ✔ Container docker-worker-1          Started                                                                 6.4s 
 ✔ Container docker-nginx-1           Started                                                                 7.1s
最后检查是否所有容器都正常运行：

docker compose ps
包括 3 个业务服务 api / worker / web，以及 6 个基础组件 weaviate / db / redis / nginx / ssrf_proxy / sandbox 。

NAME                  IMAGE                              COMMAND                   SERVICE      CREATED              STATUS                        PORTS
docker-api-1          langgenius/dify-api:0.6.13         "/bin/bash /entrypoi…"   api          About a minute ago   Up About a minute             5001/tcp
docker-db-1           postgres:15-alpine                 "docker-entrypoint.s…"   db           About a minute ago   Up About a minute (healthy)   5432/tcp
docker-nginx-1        nginx:latest                       "sh -c 'cp /docker-e…"   nginx        About a minute ago   Up About a minute             0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp
docker-redis-1        redis:6-alpine                     "docker-entrypoint.s…"   redis        About a minute ago   Up About a minute (healthy)   6379/tcp
docker-sandbox-1      langgenius/dify-sandbox:0.2.1      "/main"                   sandbox      About a minute ago   Up About a minute             
docker-ssrf_proxy-1   ubuntu/squid:latest                "sh -c 'cp /docker-e…"   ssrf_proxy   About a minute ago   Up About a minute             3128/tcp
docker-weaviate-1     semitechnologies/weaviate:1.19.0   "/bin/weaviate --hos…"   weaviate     About a minute ago   Up About a minute             
docker-web-1          langgenius/dify-web:0.6.13         "/bin/sh ./entrypoin…"   web          About a minute ago   Up About a minute             3000/tcp
docker-worker-1       langgenius/dify-api:0.6.13         "/bin/bash /entrypoi…"   worker       A
访问 Dify
在浏览器中输入http://本机ubuntu地址， 访问 Dify。

！！！这里不少网友会踩坑，也就是往后设置ollama模型地址时会报错，找不到ollama服务地址，这里需要再ubuntu中更改一下设置。

$ sudo vim /etc/systemd/system/ollama.service
在[Service]中加入下面的命令：

Environment="OLLAMA_HOST=0.0.0.0:11434"
保存退出，重新加载systemd守护进程并启用Ollama服务：

  sudo systemctl daemon-reload
  sudo systemctl enable ollama
  sudo systemctl start ollama
在本机访问http://本机ubuntu地址:11434/后，有如下显示即可：

图片

让我们来接着上一次，开始配置Dify，第一次打开界面需要注册管理员账户：

图片

我随意注册一个账号，注册完成后，显示界面：

图片

点击右上角账户：

图片

点击设置：

图片

选择Ollama模型，点击添加模型，填写如下设置：

图片

基础URL是我本机的使用的，大家可以根据前两步自己的地址填写，点击保存。

图片

这里提醒大家一下，最好刷新一下界面，回到主界面。

图片

点击创建空白应用。

图片

点击创建，

图片

右上角选择刚才设置好的llama3.1模型，

图片

点击更新，点击运行，会打开新的界面。

图片

点击Start Chat，开始梦幻旅行吧。

图片

最后附上Dify官网地址：https://difyai.com/

是不是非常简单？科技改变生活，未来智能大模型一定会在各个领域中崭露头角。
