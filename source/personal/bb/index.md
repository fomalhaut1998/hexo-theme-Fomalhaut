---
title: 唠叨
date: 2022-09-08 23:08:13
comments: false
---

<style>
/* 哔哔页面 */
#bibi button {
  color: #fff;
  border: 0;
  margin: 20px auto;
  border-radius: 0.3125rem;
  display: block;
  padding: 0 1rem;
  height: 40px;
  font-weight: 500;
  text-align: center;
  transition: all 0.5s ease-out;
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 1000% 1000%;
  animation: Gradient 60s linear infinite;
  outline: 0;
}

#bibi .bb-info {
  font-weight: 700;
  font-size: 22px;
}

#bibi .bb-card {
  padding: 15px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #a5a5a5ee;
  margin-top: 20px;
  transition: all 0.25s;
  user-select: none;
  width: calc(48% - 7px);
  margin: 10px;
}

@media screen and (max-width: 800px) {
  #bibi .bb-card {
  width: 100%;
  }
}

#bibi .bb-card:hover {
  box-shadow: 0 5px 10px 8px #07111b29;
  transform: translateY(-3px);
}

#bibi .card-header {
  display: flex;
  align-items: center;
}

#bibi .card-header .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 10px;
  border-radius: 20px;
  overflow: hidden;
}

#bibi .card-header svg {
  height: 20px;
  width: 20px;
  margin-left: 5px;
}

#bibi .card-header .card-time {
  font-size: 12px;
  text-shadow: #d9d9d9 0 0 1px, #fffffb 0 0 1px, #fffffb 0 0 2px;
  margin-left: 10px;
}

#bibi .card-content {
  padding: 10px 0;
  white-space: pre-wrap;
}

#bibi .card-footer {
  display: flex;
  padding-bottom: 10px;
}

#bibi .card-footer .card-label {
  border-radius: 5px;
  padding: 0 5px;
  font-weight: 550;
  border-radius: 5px;
  box-shadow: inset 0 -1px 0 rgb(27 31 35 / 12%);
  font-size: 14px;
  user-select: none;
  margin-right: 10px;
}

div#bb_loading img{
  border-radius: 15px;
}

#bb-main {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
}

</style>

<script src="/js/bibi.js"></script>

<div id="bibi">
<div class="bb-info"></div><div id="bb-main"></div>
</div>
