---
title: kvm-config
date: 2025-07-27
description: 介绍 Linux 上的 KVM 配置、virtio-win 驱动、挂载只读文件、VirtIO-FS 或 Samba 共享文件夹、为 Anki 配置端口转发
---

# kvm-config

## 简介

介绍 Linux 上的 KVM 配置、virtio-win 驱动、挂载只读文件、VirtIO-FS 或 Samba 共享文件夹、为 Anki 配置端口转发

## 检查

### 检测 CPU 是否支持虚拟化

```bash
egrep -c '(vmx|svm)' /proc/cpuinfo
```

如果返回 0，需进入 BIOS 启用虚拟化（通常名为 Intel VT-x 或 AMD-V），如果是其他数字则支持

### 检测内核是否加载

```bash
lsmod | grep kvm
```

以下为正常输出

```bash
kvm_intel 或 kvm_amd
kvm
```

若无输出，则需要手动加载

```bash
sudo modprobe kvm
```

Intel CPU 加载：

```bash
sudo modprobe kvm_intel
```

AMD CPU 加载：

```bash
sudo modprobe kvm_amd
```

### windows 镜像

win10 镜像可在微软官网下载

https://www.microsoft.com/zh-cn/software-download/windows10ISO

win7 镜像可在第三方存档站点下载

https://hellowindows.cn/

## 安装

### 下载

qemu-system-x86：虚拟机

virt-manager：图形化管理工具（GUI）

libvirt-daemon-system： virt-manager 的依赖

libvirt-clients：管理虚拟机的 CLI 工具

```bash
sudo apt install qemu-system-x86 libvirt-daemon-system libvirt-clients virt-manager
```

### 查看并添加组

查看 libvirt

```bash
getent group | grep libvirt
```

类似输出如下

```bash
libvirt:x:125:
libvirt-qemu:x:64055:libvirt-qemu
```

查看 kvm

```bash
getent group | grep kvm
```

类似输出如下

```bash
kvm:x:104:
```

备注：输出格式为 组名:密码占位符:GID:成员列表

添加当前用户到 kvm 和 libvirt 组（否则每次都需要 sudo 命令）

```bash
sudo usermod -aG libvirt $(whoami)
sudo usermod -aG kvm $(whoami)
```

备注：注销并重新登陆后生效

## 创建虚拟机

### 基础

启动虚拟机 GUI

```bash
virt-manager
```

点击 文件 - 新建虚拟机 - 选择本地安装介质

一般 win7 选择 1 核 2GB 内存，win10 选择 2 核 4GB 内存

务必在最后一步勾选在安装前自定义配置

进入自定义配置界面后，选择左侧菜单栏 SATA CDROM1 并点击右下角 remove 移除 windows 镜像，稍后会添加

下载 windows 驱动 virtio-win.iso
https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/virtio-win.iso

点击添加硬件，点击存储，选择 CDROM 设备，SATA 类型，手动选择刚刚下载的 virtio-win.iso 路径

点击添加硬件，点击存储，选择 CDROM 设备，SATA 类型，手动选择 windows 镜像路径

在引导选项中确保将 SATA CDROM 2（Windows ISO）拖到启动顺序首位
，SATA CDROM 1（VirtIO 驱动）在第二位，SATA 磁盘 1 和 NIC 在末尾

在左侧 SATA 磁盘 1 选项中，磁盘总线选择 virtio

在 NIC 网卡选项中，设备型号选择 virtio

### 网络

检查 default 网络状态

```bash
sudo virsh net-list --all
```

启动 default 网络

```bash
sudo virsh net-start default
```

设置 default 网络自启动

```bash
sudo virsh net-autostart default
```

检查 libvirtd 服务状态

```bash
sudo systemctl status libvirtd
```

如果 default 网络仍然无法启动，可能是 libvirtd 服务未运行：

```bash
sudo systemctl start libvirtd
sudo systemctl enable libvirtd
```

KVM 默认使用 iptables/nftables 管理 NAT 网络。如果防火墙规则被清空，可能导致网络无法激活。可以尝试重启 libvirtd 重新生成规则：

```bash
sudo systemctl restart libvirtd
```

验证网络是否正常工作

```bash
sudo virsh net-info default
# 类似如下输出
# 名称：       default
# UUID：       xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# 活动：       是
# 持久：       是
# 自动启动：   是
# 桥接：       virbr0
```

检查 virbr0 接口是否存在

```bash
ip a show virbr0
```

如果还无法启动，可以删除并重建 default 网络

```bash
sudo virsh net-destroy default
sudo virsh net-undefine default
sudo virsh net-define /usr/share/libvirt/networks/default.xml
sudo virsh net-start default
sudo virsh net-autostart default
```

## 启动

点击左上角开始安装

### 驱动

当提示"您想将 Windows 安装在哪里"时：

点击"加载驱动程序"

浏览选择 virtio-win.iso（这个驱动器里面包含多个 windows 驱动）

viostor 驱动，用来加载 VirtIO 磁盘，如果不安装，安装系统时会提示 “找不到磁盘”

win10 路径通常为：E:\viostor\w10\amd64，win7 路径通常为 E:\viostor\w7\amd64（如果仍然看不到驱动，尝试 取消勾选 "隐藏与此计算机不兼容的驱动器"）

备注：格式为 驱动名称\系统版本\系统位数，可根据自己的情况选择

网络驱动：virtio-win.iso\NetKVM\[系统版本]\[系统位数]

如果你虚拟机安装的是 win10 及以上版本，那么以下的驱动可以进入系统后 **自动安装**；如果是 win7 及以下版本，则需要 **手动安装**

内存驱动：virtio-win.iso\Balloon\[系统版本]\[系统位数]（动态调整虚拟机内存使用）

增强串口通信（某些工具如 SPICE 依赖它）：virtio-win.iso\vioserial\[系统版本]\[系统位数]

优化鼠标/键盘输入（减少延迟）：virtio-win.iso\vioinput\[系统版本]\[系统位数]

显卡驱动：virtio-win.iso\qxl\[系统版本]\[系统位数]

熵生成设备驱动：virtio-win.iso\viorng\[系统版本]\[系统位数]

系统安装完成后，win10 可以直接运行 virtio-win.iso 根目录下的 virtio-win-guest-tools.exe（自动安装所有驱动，仅 win10 以上有用）

## 挂载只读目录

创建共享目录

```bash
mkdir ~/shared-folder
```

将共享文件夹的组改为 libvirt-qemu，并确保组有读权限

```bash
sudo chown $(whoami):libvirt-qemu ~/shared-folder
sudo chmod 750 ~/shared-folder
```

自动创建目录（由于 tmp 目录中的文件重启后会自动删除）

```bash
echo "d /tmp/virtiofs-upper 0750 root root -" | sudo tee /etc/tmpfiles.d/virtiofs.conf
echo "d /tmp/virtiofs-work 0750 root root -" | sudo tee -a /etc/tmpfiles.d/virtiofs.conf
```

立即生效

```bash
sudo systemd-tmpfiles --create
```

手动挂载 overlayfs（主机重启后失效，需配置 systemd 自启动）
说明：将 shared-folder 挂载到 readonly-share 是为了防止虚拟机传播病毒到主机，此时虚拟机对共享文件夹的写入操作会存到 virtiofs-upper 内存中，而不是磁盘，重启会自动删除（实际上只有读取权限，并不会写入，配置是为了以防万一）

```bash
sudo mkdir -p /mnt/readonly-share
sudo mount -t overlay overlay -o \
lowerdir=/home/<your-user>/shared-folder,\
upperdir=/tmp/virtiofs-upper,\
workdir=/tmp/virtiofs-work,\
nosuid,noexec,ro /mnt/readonly-share
```

验证挂载属性

```bash
mount | grep readonly-share
# 应该会输出：...ro... (read-only)
```

备注：其他命令（当你不想使用共享文件夹时会用到的命令）

```bash
# 查看所有的挂载点
mount | grep overlay

# 卸载挂载点
sudo umount /mnt/readonly-share

# 恢复默认设置
sudo mount -o remount,exec /mnt/readonly-share
```

设置开机自动挂载

这里以 systemd 为例配置自启动，当然还有其他方式，但不是很推荐，例如 fstab

```bash
sudo vim /etc/systemd/system/virtiofs-mount.service
```

编辑 virtiofs-mount.service 文件并添加以下内容

```ini
[Unit]
Description=Mount OverlayFS Share
Requires=systemd-tmpfiles-setup.service
After=systemd-modules-load.service systemd-tmpfiles-setup.service local-fs.target
# 显式依赖systemd-tmpfiles-setup服务，即创建/tmp/virtiofs-upper和/tmp/virtiofs-work目录后再挂载。
# After显式声明则表示在内核模块，基础文件系统服务加载后再挂载

[Service]
Type=oneshot

# 确保目录存在（如果没有配置 tmpfiles.d 的话，可以添加以下命令，但由于我们之前配置过了，这里就注释掉了）
# ExecStartPre=/bin/mkdir -p /tmp/virtiofs-upper /tmp/virtiofs-work /mnt/readonly-share

ExecStart=/bin/mount -t overlay overlay -o lowerdir=/home/<your-user>/shared-folder,upperdir=/tmp/virtiofs-upper,workdir=/tmp/virtiofs-work,nosuid,noexec,ro /mnt/readonly-share
RemainAfterExit=yes

# 卸载命令（可选）
ExecStop=/bin/umount /mnt/readonly-share

# 确保挂载后状态持续
RemainAfterExit=yes

# 超时设置（防止阻塞）
TimeoutStartSec=30s

[Install]
WantedBy=multi-user.target
```

刷新并启动

```bash
# sudo umount /mnt/readonly-share #如果之前手动挂载过的话，需要先解除，不然测试就没有效果了
sudo systemctl daemon-reload
sudo systemctl enable --now virtiofs-mount.service
```

验证

```bash
mount | grep readonly-share
systemctl status virtiofs-mount.service
```

检查挂载点是否真正只读

```bash
touch /mnt/readonly-share/test_file # 应该报错 "Read-only file system"
```

### 小插曲

以上是使用 systemd 方式来配置自动挂载，其实还可以通过 fstab，但是呢，尽量不要编辑/etc/fstab 文件（或像如下命令间接编辑），如果配置错误，会无法开机，并进入 emergency mode（紧急模式），况且，就算你配置没问题，也会带来一些小问题（~~怎么突然押韵上了~~)，比如无法显式控制加载顺序，比如在内核加载后，目录创建后再挂载

```bash
echo "overlay /mnt/readonly-share overlay lowerdir=/home/<your-user>/shared-folder,upperdir=/tmp/virtiofs-upper,workdir=/tmp/virtiofs-work,nosuid,noexec,ro 0 0" | sudo tee -a /etc/fstab
```

如果“不小心”进入了紧急模式，并无法开机进入桌面，会提示输入 root 密码，类似输出如下（因为我是真的进入过 QwQ）

```bash
# You are in emergency mode. After logging in, type "journalctl -xb" to view
# system logs, "systemctl reboot" to reboot, "systemctl default" or "exit"
# to boot into default mode.
# Give rootpassuord for maintenance
# (or press: Control-D to continue)：
```

输入密码，进入终端，由于紧急模式下的根文件目录一般是只读挂载，我们可以检查一下（不要忘记字符串里面空格的说）

```bash
mount | grep " / "
```

如果输出为 ro（read-only），需要重新挂载为可写

```bash
mount -o remount,rw /
```

注释掉你之前添加到/etc/fstab 文件的内容

```bash
sudo vim /etc/fstab
```

退出终端会自动重启

```bash
exit
```

## VirtIO-FS 共享文件夹 (win10)

检查内核模块是否加载

```bash
lsmod | grep virtiofs
```

如果没有输出，需要加载模块

```bash
sudo modprobe virtiofs
```

让主机开机自动加载 virtiofs 模块

```bash
sudo tee /etc/modules-load.d/virtiofs.conf <<< "virtiofs"
```

重启后验证是否生效

```bash
sudo systemctl restart systemd-modules-load
lsmod | grep virtiofs
```

获取所有虚拟机名称

```bash
sudo virsh list --all
```

关闭虚拟机运行，并编辑虚拟机 xml 配置文件

```bash
sudo virsh edit win10 # "win10" 是我的虚拟机名称
```

在 devices 标签内部添加：

```xml
<filesystem type="mount" accessmode="passthrough">
  <driver type="virtiofs"/>
  <source dir="/mnt/readonly-share"/>
  <target dir="shared_mount"/>
</filesystem>
```

在 vcpu 标签之前添加

```xml
<memoryBacking>
    <source type="memfd"/>
    <access mode="shared"/>
</memoryBacking>
```

修改 cpu 标签为

```xml
<cpu mode='host-passthrough' check='none' migratable='on'>
  <numa>
    <cell id='0' cpus='0-1' memory='4194304' unit='KiB' memAccess='shared'/>
  </numa>
</cpu>
```

VirtIO-FS 依赖 WinFSP 才能在 Windows 上运行，因此需要先在虚拟机安装它：

下载地址 https://winfsp.dev/rel/

安装好后检查 C:\Program Files (x86)\WinFsp\bin 文件夹是否包含 winfsp-x64.dll

win+r 输入 sysdm.cpl，确保系统环境变量包含 C:\Program Files (x86)\WinFsp\bin

win+r 输入 devmgmt.msc，点击系统设备，找到 VirtIO-FS Device，右键选择 "更新驱动程序"，指向 virtio-fs/viofs 目录（如 E:\virtio-fs\w10\amd64 或者 E:\viofs\w10\amd64）

win+r 输入 services.msc，找到 VirtIO-FS Service 并启动它（最好在属性里改为自动）

现在可以在 win+e 打开资源管理器中看到 shared_mount 共享文件夹，并且可以发现虚拟机无法直接创建和修改共享文件夹的文件，因此即使虚拟机被病毒感染，也无法通过共享文件夹传播给主机

## Sumba 共享文件夹 (win7)

以上的 virtio-fs 的驱动并不支持 win7，而且开发者表示并不打算兼容旧系统，可以从下方的开发者回复中看到

https://github.com/virtio-win/kvm-guest-drivers-windows/issues/728

但我们可以尝试使用 Samba 来共享文件夹，这个比 virtio-fs 简单，而且还不用配置虚拟机的 xml 文件

安装 sumba

```bash
sudo apt install samba samba-common
```

编辑配置文件

```bash
sudo vim /etc/samba/smb.conf
```

文件末尾添加以下内容

```bash
[win7_share]
path = /mnt/readonly-share
browsable = yes
writable = no # 不可写
guest ok = no            # 关闭匿名访问
valid users = <your-username> # 自定义你的用户名
read only = yes # 只读（与 writable=no 等效）
force user = root # 强制以 root 身份访问（由于是只读挂载，并没有安全风险）
```

设置密码

```bash
sudo smbpasswd -a <your-username>
```

其他命令

```bash
# 修改密码
sudo smbpasswd <your-username>

# 删除用户
sudo smbpasswd -x <your-username>
```

每次修改 samba 配置文件时要记得重启

```bash
sudo systemctl restart smbd nmbd
sudo systemctl enable smbd nmbd
```

检查状态

```bash
sudo systemctl status smbd nmbd
```

查看 linux 主机 virbr0 网关地址（一般为 192.168.122.1），建议填写网关地址，而不是主机 ip ，是因为局域网的 ip 会变动，而每次都需要修改很麻烦

```bash
ip addr show
```

在 win7 虚拟机中查看是否可以连接主机

```bash
ping <your-ip>
```

若无法连接，请检查 nat 网络，打开 win7 虚拟机命令提示符，运行：

```bash
sc query lanmanworkstation
```

如果显示 STATE : RUNNING，表示 SMB 服务已启动。

如果没有显示，则需要手动开启，win+r 输入 control，进入控制面板，点击 程序 - 程序和功能 - 打开或关闭 windows 功能 -勾选 SMB/CIFS 文件共享支持，重启虚拟机

在 linux 主机检查状态

```bash
smbclient -N -L //127.0.0.1
```

打开计算机 → 右键添加一个网络位置

填写共享路径

```bash
\\<your-ip>\win7_share
# 备注：格式为 \\宿主机网关地址\共享名
```

之后输入你之前设置的用户名和密码就可以访问啦

其他安全配置

先用虚拟机连接到共享文件夹，然后在主机执行以下命令查询连接的 ip

```bash
sudo smbstatus
```

编辑 samba 配置文件

```bash
sudo vim /etc/samba/smb.conf
```

在[global]字段中，添加你的 ip

```bash
hosts allow = <your-ip> 127.0.0.1
hosts deny = ALL
```

如果你所在的局域网没有其他人使用的话，也可以添加整个局域网 ip 段（这样比较省事，因为虚拟机的自身 ip 可能会变动）

```bash
hosts allow = 192.168.0.0/16
```

重启 sumba

```bash
sudo systemctl restart smbd nmbd
```

## 配置 Ankiweb 端口转发

由于 [Ankiweb](https://apps.ankiweb.net/) 不支持 win7，不方便使用 [LunaTranslator](https://github.com/HIllya51/LunaTranslator) 添加卡片来学习单词，但是我们可以使用端口转发来解决这个问题

原理：虚拟机中运行的 LunaTranslator 发送卡片数据到虚拟机 8765 端口，虚拟机 8765 端口转发到宿主机网关 IP 对应的 8765 端口，Linux 主机运行的 Anki 监听到请求并通过原路返回响应

首先需要 Linux 主机安装好 [Anki](https://apps.ankiweb.net/#downloads)，并安装 AnkiConnect 插件

安装插件步骤：从 [AnkiConnect](https://git.sr.ht/~foosoft/anki-connect) 获取数字代码，打开 Anki - 工具 - 插件 - 获取插件 - 输入数字代码

打开 Anki 的工具栏 - 插件 - AnkiConnect - 双击打开 - 编辑 webBindAddress 的地址为 0.0.0.0

查看 linux 主机的 virbr0 网关地址（一般为 192.168.122.1）

```bash
ip addr show
```

在 win7 虚拟机中测试连接

win+r 输入 control，进入控制面板，点击 程序 - 程序和功能 - 打开或关闭 windows 功能 - 勾选 telnet 客户端

```bash
telnet <your-ip> 8765
```

如果黑屏且光标闪烁代表连接成功（关闭终端窗口即可关闭连接，或者使用 `ctrl+]` 快捷键+ quit 命令退出，但有时会不起作用）
由于 LunaTranslator 只能修改连接 anki 的端口，无法修改为主机的网关 ip,因此需要配置端口转发

添加端口转发规则（NAT 规则）

```bash
netsh interface portproxy add v4tov4 listenport=8765 listenaddress=127.0.0.1 connectport=8765 connectaddress=<your-ip>
```

验证规则是否生效

```bash
netsh interface portproxy show all
# 输出类似如下
# 监听地址     : 127.0.0.1
# 监听端口     : 8765
# 连接地址     : 192.168.122.1
# 连接端口     : 8765
```

测试连接

```bash
telnet 127.0.0.1 8765
```

如果没问题的话，就可以使用啦 w
