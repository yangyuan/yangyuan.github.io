---
layout: post
title: WIN-PROCFS
---

要是三四年前要问我最善于什么编程技术，毫无疑问 Windows API。
其实我 WIN32 的熟练程度根本不能与 C# 和 PHP 比，但是因为 WIN32 了解的人比较少，所以显得最拿得出手。

WIN32 是一套成熟的 API 体系，如果把它看成是一套类库就太小看了。WIN32 写程序很麻烦，比 C# 什么麻烦的多，但并非 C++ 做不到，而是 WIN32 提供的是从操作系统层面的接口。
比如一般的类库会提供类似命令 dir（或者ls）的函数，WIN32 却不提供，你需要调用多个函数实现迭代查找，只因为 dir 这种接口不可控，这就是 WIN32 的特点。

WIN-PROCFS
----
WIN-PROCFS 主要目的是实现 WINDOWS 系统监控，但是不使用 WMI，因为毕竟考虑到 COMLESS 环境，WMI 可能在极端情况下无法执行。
所以直接调用 WIN32 API 实现系统状态信息汇总，类似 PROCFS，且优先使用 WINDOWS 通用 API，其次使用 NT 特有 API。
[!code=vc]

内存信息获取
----
WinBase.h 下的 GlobalMemoryStatusEx，返回 MEMORYSTATUSEX 结构体。

```cpp
MEMORYSTATUSEX memory_status_ex;
memory_status_ex.dwLength = sizeof (MEMORYSTATUSEX);
GlobalMemoryStatusEx(&memory_status_ex);
_tprintf(_T("MemTotal: %I64d\n"), memory_status_ex.ullTotalPhys);
_tprintf(_T("MemFree: %I64d\n"), memory_status_ex.ullAvailPhys);
_tprintf(_T("SwapTotal: %I64d\n"), memory_status_ex.ullTotalPageFile);
_tprintf(_T("SwapFree: %I64d\n"), memory_status_ex.ullAvailPageFile);
```

处理器信息获取
----
### NtQuerySystemInformation
这件事说来话有点长，网上用关键词找到的大部分资料都不太合适。
由于某些原因，微软一直没提供CPU性能相关的公共API，虽然一些官方组件（如PDH，WMI）进行查询，但是没有直接提供系统级的API。
对于NT系统，微软后来公布了 NtQuerySystemInformation 的使用说明，但是似乎并没有被太多人发现。
[url]http://msdn.microsoft.com/en-us/library/windows/desktop/ms724509.aspx[/url]

NtQuerySystemInformation函数的C语言定义如下
```cpp
__kernel_entry NTSTATUS NTAPI NtQuerySystemInformation (
    IN SYSTEM_INFORMATION_CLASS SystemInformationClass,
    OUT PVOID SystemInformation,
    IN ULONG SystemInformationLength,
    OUT PULONG ReturnLength OPTIONAL);

```

这是一个私有函数，不提供链接库，所以使用时，需要使用函数指针+运行时动态连接。
```cpp
typedef __kernel_entry NTSTATUS (NTAPI * LPNtQuerySystemInformation) (
    IN SYSTEM_INFORMATION_CLASS SystemInformationClass,
    OUT PVOID SystemInformation,
    IN ULONG SystemInformationLength,
    OUT PULONG ReturnLength OPTIONAL
    );
LPNtQuerySystemInformation NtQuerySystemInformation = 
    (LPNtQuerySystemInformation) GetProcAddress(LoadLibrary(_T("Ntdll.dll")), _T("NtQuerySystemInformation"));
```
然后就可以使用了。假如已知CPU有4个核，那么可以这么获取基本信息。

```cpp
SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION sppi[4];
ULONG size;
NtQuerySystemInformation (SYSTEM_INFORMATION_CLASS::SystemProcessorPerformanceInformation, &sppi, sizeof(sppi), &size);
```
### IdleTime, KernelTime, UserTime
无论是每个CPU（SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION）或者整个系统（GetSystemTimes），都能取到这个三个时间。
KernelTime是执行内核的时间计数器，UserTime是用户模式下的时间计数器。
单位均为 100-nanosecond，注意是从系统开始至今的所有统计，需要自己计算百分比，使用多线程配合Sleep比较合适，单线程算时差可能会不太准确。
### GetSystemTimes
[url]http://msdn.microsoft.com/en-us/library/windows/desktop/ms724400.aspx[/url]

网络信息获取
----
### Adapter，Interface
微软在自己的MSDN不同模块有着矛盾的概念。
有的模块认为Interface和Adapter一对一，只是Interface是软件为主的抽象，Adapter是硬件为主的封装。
而有的地方，Adapter和Interface却没直接关系。Interface包容了所有的连接，包括桥接，ppp等。而Adapter是指硬件设备。
这导致我一开始使用GetIfTable接口，却找不到办法过滤虚拟网卡和物理网卡。
### GetAdaptersInfo & GetAdaptersAddresses
两者都能获取主要物理网卡的信息，不一样的是。GetAdaptersInfo 函数比较老，只获取物理网卡的信息附带IPV4的信息，GetAdaptersAddresses 则获取任何带IP的Adapter信息，包含虚拟的Adapter（比如Software Loop）。GetAdaptersAddresses 更通用，但是操作更难，并且很多字段是Vista之后才有（比如当前流速）。从兼容的角度，还是应该使用如 GetIfTable 获取对应 Interface 的网络流量。

磁盘信息获取
----
到这个时候，不可回避地要说明一个问题。
Windows API本身不是系统内部的API，而是专门暴露给程序员使用的开发API，它具有很好的扩展性和跨平台性。因此我们拿到的API都是经过逻辑抽象之后的。
比如网络信息获取的时候，就存在Interface和Adapter两个概念，但是我们拿到的仍然并非是网卡本身。
类似的，我们能看出内存的信息，但是却不知道内存什么型号。这种硬件级别的信息，需要从完全另一套设备管理的API走（比如Setup API）。

```
    系统API、网络管理API、存储管理API              设备管理API
------------------------------------
    系统管理：系统管理、网络管理、存储管理
    内存 虚拟内存 处理器 处理器核 网络 存储
--------------------------------------------------------------
    设备管理：驱动和设备管理
    内存条 处理器 网卡 硬盘 光盘 其他设备
---------------------------------------------------------------
```

到硬盘这边，我们就遇到了一点麻烦。通常我们希望得到如sda、sda1这种信息，但是存储这边的API，只能得到sda1，得不到sda。
虽然实际开发中，我们通常使用文件函数和 `\\.\PhysicalDriveN` 来枚举可能存在的硬盘，但是需要指明的是，这不是合理的操作。很多程序无法自适应硬盘拔插，跟这个有直接关系。
如果需要找到具体有哪些 `\\.\PhysicalDriveN`，最安全的方法是使用 SetupAPI 遍历设备，然后取得所有存储设备 ID。
从监控的角度，我们不需要知道硬盘的具体型号，所以遍历抽象概念Volume即可。
### Volume
`FindFirstVolume`, `FindNextVolume`, `FindVolumeClose` 就跟文件操作一样，没什么特别的.

测试代码
====

```cpp
#pragma once

#include <WinSock2.h>
#include <IPHlpApi.h>
#include <Windows.h>
#include <Psapi.h>

#include <winternl.h>
#include <stdio.h>
#include <tchar.h>
#include <strsafe.h>

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "psapi.lib")

typedef __kernel_entry NTSTATUS(NTAPI * LPNtQuerySystemInformation) (
    IN SYSTEM_INFORMATION_CLASS SystemInformationClass,
    OUT PVOID SystemInformation,
    IN ULONG SystemInformationLength,
    OUT PULONG ReturnLength OPTIONAL
    );
LPNtQuerySystemInformation _NtQuerySystemInformation;

int fetch_cpu();
int fetch_mem();
int fetch_disk();
int fetch_net();

int _tmain(int argc, _TCHAR* argv[])
{
    _NtQuerySystemInformation = (LPNtQuerySystemInformation)GetProcAddress(LoadLibrary(_T("Ntdll.dll")), "NtQuerySystemInformation");

    while (true) {
        fetch_net();
        fetch_cpu();
        fetch_mem();
        fetch_disk();
        Sleep(1000);
    }
    return 0;

    /*
    MultiByteToWideChar(CP_ACP, NULL, iaa->AdapterName, -1, name, 255);
    HRESULT hr = StringCchPrintf(pszDest, cchDest, pszFormat);
    */
}

int fetch_net() {

    DWORD size = 0;
    ULONG ret = GetAdaptersAddresses(AF_UNSPEC, NULL, NULL, NULL, &size);

    IP_ADAPTER_ADDRESSES * iaas = NULL;
    iaas = (IP_ADAPTER_ADDRESSES *)HeapAlloc(GetProcessHeap(), 0, size);
    ret = GetAdaptersAddresses(AF_UNSPEC, NULL, NULL, iaas, &size);

    IP_ADAPTER_ADDRESSES * iaa = iaas;
    MIB_IFROW mib_ifrow;

    WCHAR name[256];
    while(1) {
        if (iaa == NULL) break;
        if (iaa->OperStatus != IF_OPER_STATUS::IfOperStatusUp) {
            iaa = iaa->Next;
            continue;
        }

        if (iaa->IfType != IF_TYPE_ETHERNET_CSMACD && iaa->IfType != IF_TYPE_IEEE80211) {
            iaa = iaa->Next;
            continue;
        }
        //_tprintf(_T("%s\n"), iaa->AdapterName);
        _tprintf(_T("%ws\n"), iaa->Description);


        ZeroMemory(&mib_ifrow, sizeof(mib_ifrow));


        mib_ifrow.dwIndex = iaa->IfIndex;

        GetIfEntry(&mib_ifrow);

        _tprintf(_T("Data In  %ld\n"), mib_ifrow.dwInOctets);
        _tprintf(_T("Data Out %ld\n"), mib_ifrow.dwOutOctets);

        _tprintf(_T("\n"));
        iaa = iaa->Next;
    }
    return 0;
}


int fetch_cpu() {
    SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION spi[12];
    ULONG size;
    NTSTATUS x = _NtQuerySystemInformation(SYSTEM_INFORMATION_CLASS::SystemProcessorPerformanceInformation, &spi, sizeof(spi), &size);

    LONGLONG t = spi[0].IdleTime.QuadPart;
    _tprintf(_T("MemTotal: %I64d\n"), t);
    return 0;
}


int fetch_mem() {
    PERFORMANCE_INFORMATION pi;
    pi.cb = sizeof(pi);

    GetPerformanceInfo(&pi, sizeof(pi));

    _tprintf(_T("MemTotal: %ld MB\n"), (LONG)(((ULONGLONG)pi.PageSize * pi.PhysicalTotal) / 1024 / 1024));
    _tprintf(_T("MemFree: %ld MB\n"), (LONG)(((ULONGLONG)pi.PageSize * pi.PhysicalAvailable) / 1024 / 1024));

    _tprintf(_T("Cached: %ld MB\n"), (LONG)(((ULONGLONG)pi.PageSize * pi.SystemCache) / 1024 / 1024));
    _tprintf(_T("Buffers: %ld MB\n"), (LONG)(((ULONGLONG)pi.PageSize * pi.KernelPaged) / 1024 / 1024));

    _tprintf(_T("SwapTotal: %ld MB\n"), (LONG)(((ULONGLONG)pi.PageSize * pi.CommitLimit) / 1024 / 1024));
    _tprintf(_T("SwapFree: %ld MB\n"), (LONG)(((ULONGLONG)pi.PageSize * (pi.CommitLimit - pi.CommitTotal)) / 1024 / 1024));

    return 0;
}


int fetch_disk() {

    _TCHAR  VolumeName[MAX_PATH] = _T("");
    HANDLE FindHandle = FindFirstVolume(VolumeName, ARRAYSIZE(VolumeName));
    DWORD  Error = ERROR_SUCCESS;


    if (FindHandle == INVALID_HANDLE_VALUE)
    {
        Error = GetLastError();
        wprintf(L"FindFirstVolumeW failed with error code %d\n", Error);
        return 0;
    }


    _TCHAR  VolumePathName[MAX_PATH] = _T("");
    DWORD  CharCount = 0;
    while (true)
    {
        // _tprintf(_T("%s\n"), VolumeName);

        DWORD junk;
        BOOL xx = GetVolumePathNamesForVolumeName(VolumeName, VolumePathName, MAX_PATH, &junk);
        if (GetDriveType(VolumePathName) == DRIVE_FIXED) {

                size_t len;
            StringCchLength(VolumeName, MAX_PATH, &len);
            _TCHAR  VolumeNamex[MAX_PATH] = _T("");
            ZeroMemory(VolumeNamex, sizeof(VolumeNamex));
            StringCchCopy(VolumeNamex, len, VolumeName);

            HANDLE  hDevice = CreateFile(VolumeNamex, 0, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_EXISTING, 0, NULL);
            DISK_PERFORMANCE dp;

            DeviceIoControl(hDevice,                       // device to be queried
                IOCTL_DISK_PERFORMANCE, // operation to perform
                NULL, 0,                       // no input buffer
                &dp, sizeof(dp),            // output buffer
                &junk,                         // # bytes returned
                (LPOVERLAPPED)NULL);
            _tprintf(_T("%s\n"), VolumeName);
            static ULARGE_INTEGER FreeBytesAvailable, TotalNumberOfBytes, TotalNumberOfFreeBytes;
            _tprintf(_T("1111\n"));
            GetDiskFreeSpaceEx(VolumePathName, &FreeBytesAvailable, &TotalNumberOfBytes, &TotalNumberOfFreeBytes);
            _tprintf(_T("2222\n"));
            _tprintf(_T("Volume: %s\n"), VolumePathName);
            _tprintf(_T("BytesRead: %I64d\n"), dp.BytesRead);
            _tprintf(_T("FreeBytesAvailable: %I64d\n\n"), FreeBytesAvailable);
        }
        BOOL Success = FindNextVolume(FindHandle, VolumeName, ARRAYSIZE(VolumeName));

        if (!Success)
        {
            Error = GetLastError();

            if (Error != ERROR_NO_MORE_FILES)
            {
                wprintf(L"FindNextVolumeW failed with error code %d\n", Error);
                break;
            }

            Error = ERROR_SUCCESS;
            break;
        }
        
    }

    FindVolumeClose(FindHandle);
    FindHandle = INVALID_HANDLE_VALUE;


    DWORD drivers = GetLogicalDrives();
    return 0;
}
```