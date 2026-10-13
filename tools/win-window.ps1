# 列出 / 显示 Notrat 窗口（用于截图实例：窗口必须可见，合成器才出帧）
# 用法：
#   powershell -File tools/win-window.ps1 list
#   powershell -File tools/win-window.ps1 show <handle> [x y w h]
param(
  [string]$Action = "list",
  [string]$Handle = "",
  [int]$X = 40, [int]$Y = 40, [int]$W = 1120, [int]$H = 860
)
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinApi {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
}
"@
$script:found = New-Object System.Collections.ArrayList
$cb = [WinApi+EnumProc]{
  param($h, $l)
  $sb = New-Object System.Text.StringBuilder 512
  [WinApi]::GetWindowText($h, $sb, 512) | Out-Null
  $t = $sb.ToString()
  if ($t -like "*Notrat*") {
    $procId = [uint32]0
    [WinApi]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
    $null = $script:found.Add([pscustomobject]@{
      Handle = [int64]$h
      Pid    = $procId
      Visible = [WinApi]::IsWindowVisible($h)
      Minimized = [WinApi]::IsIconic($h)
      Title  = $t
    })
  }
  return $true
}
[WinApi]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null

if ($Action -eq "list") {
  $script:found | ForEach-Object {
    $p = Get-Process -Id $_.Pid -ErrorAction SilentlyContinue
    [pscustomobject]@{
      Handle = $_.Handle; Pid = $_.Pid; Visible = $_.Visible; Minimized = $_.Minimized
      Start = $p.StartTime; Title = $_.Title
    }
  } | Format-Table -AutoSize
} elseif ($Action -eq "show") {
  $h = [IntPtr][int64]$Handle
  # SW_SHOWNA = 8（显示但不激活）。注意：Chromium 会把「被完全遮挡」的窗口标记为
  # occluded → 页面 hidden → rAF 冻结、Page.captureScreenshot 直接挂住。
  # 所以必须把它提到 z 序最前（HWND_TOP = -1），否则截图永远超时。
  [WinApi]::ShowWindow($h, 8) | Out-Null
  $top = [IntPtr]::new(-1)
  [WinApi]::SetWindowPos($h, $top, $X, $Y, $W, $H, 0x0010 -bor 0x0040) | Out-Null
  Start-Sleep -Milliseconds 400
  [pscustomobject]@{ Handle = $Handle; Visible = [WinApi]::IsWindowVisible($h); Minimized = [WinApi]::IsIconic($h) } | Format-Table -AutoSize
}
