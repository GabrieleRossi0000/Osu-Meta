param(
  [string]$SongsFolder
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Linq;

public static class OsuStableBeatmapReader
{
    const uint PROCESS_VM_READ = 0x0010;
    const uint PROCESS_QUERY_INFORMATION = 0x0400;

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int pid);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] buffer, int size, out int bytesRead);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr hObject);

    static int ReadInt32(IntPtr hProcess, int address)
    {
        byte[] buf = new byte[4];
        int read;
        if (!ReadProcessMemory(hProcess, (IntPtr)address, buf, 4, out read) || read != 4)
            return 0;
        return BitConverter.ToInt32(buf, 0);
    }

    /// <summary>32-bit CLR System.String (same layout as OsuMemoryDataProvider).</summary>
    static string ReadClrString(IntPtr hProcess, int stringObjectAddress)
    {
        if (stringObjectAddress == 0) return string.Empty;

        int length = ReadInt32(hProcess, stringObjectAddress + 4);
        if (length <= 0 || length > 512) return string.Empty;

        byte[] buf = new byte[length * 2];
        int read;
        if (!ReadProcessMemory(hProcess, (IntPtr)(stringObjectAddress + 8), buf, buf.Length, out read) || read < 2)
            return string.Empty;

        return Encoding.Unicode.GetString(buf, 0, Math.Min(length * 2, read));
    }

    static string ReadStringField(IntPtr hProcess, int beatmapAddress, int fieldOffset)
    {
        if (beatmapAddress == 0) return string.Empty;
        int stringPtr = ReadInt32(hProcess, beatmapAddress + fieldOffset);
        return ReadClrString(hProcess, stringPtr);
    }

    static int FindPattern(byte[] haystack, byte[] needle)
    {
        for (int i = 0; i <= haystack.Length - needle.Length; i++)
        {
            bool ok = true;
            for (int j = 0; j < needle.Length; j++)
            {
                if (haystack[i + j] != needle[j]) { ok = false; break; }
            }
            if (ok) return i;
        }
        return -1;
    }

    static int FindOsuBaseAddress(IntPtr hProcess, int baseAddress, byte[] moduleBytes)
    {
        byte[] primary = new byte[] { 0xF8, 0x01, 0x74, 0x04, 0x83, 0x65 };
        int rel = FindPattern(moduleBytes, primary);
        if (rel >= 0) return baseAddress + rel;

        return 0;
    }

    static int ReadCurrentBeatmapAddress(IntPtr hProcess, int osuBaseAddress)
    {
        if (osuBaseAddress == 0) return 0;
        return ReadInt32(hProcess, osuBaseAddress - 12);
    }

    public static string Read(string songsFolder)
    {
        var proc = Process.GetProcessesByName("osu!")
            .FirstOrDefault(p => !p.HasExited && p.MainModule != null);
        if (proc == null)
            return "{\"ok\":false,\"error\":\"no_process\"}";

        IntPtr hProcess = IntPtr.Zero;
        try
        {
            hProcess = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, false, proc.Id);
            if (hProcess == IntPtr.Zero)
                return "{\"ok\":false,\"error\":\"open_process_failed\"}";

            int baseAddress = proc.MainModule.BaseAddress.ToInt32();
            int moduleSize = proc.MainModule.ModuleMemorySize;
            byte[] moduleBytes = new byte[moduleSize];
            int totalRead;
            if (!ReadProcessMemory(hProcess, (IntPtr)baseAddress, moduleBytes, moduleSize, out totalRead) || totalRead < 64)
                return "{\"ok\":false,\"error\":\"read_module_failed\"}";

            int osuBase = FindOsuBaseAddress(hProcess, baseAddress, moduleBytes);
            if (osuBase == 0)
                return "{\"ok\":false,\"error\":\"pattern_not_found\"}";

            int beatmapAddr = ReadCurrentBeatmapAddress(hProcess, osuBase);
            if (beatmapAddr == 0)
                return "{\"ok\":false,\"error\":\"no_beatmap_in_memory\"}";

            string filename = ReadStringField(hProcess, beatmapAddr, 0x90);
            string folder = ReadStringField(hProcess, beatmapAddr, 0x78);
            string mapString = ReadStringField(hProcess, beatmapAddr, 0x80);
            int setId = ReadInt32(hProcess, beatmapAddr + 0xCC);
            int mapId = ReadInt32(hProcess, beatmapAddr + 0xC8);

            if (string.IsNullOrWhiteSpace(filename) || !filename.EndsWith(".osu", StringComparison.OrdinalIgnoreCase))
            {
                if (!string.IsNullOrWhiteSpace(mapString))
                {
                    return "{\"ok\":false,\"error\":\"no_beatmap_in_memory\",\"mapString\":\"" + Escape(mapString) + "\",\"setId\":" + setId + "}";
                }
                return "{\"ok\":false,\"error\":\"no_beatmap_in_memory\"}";
            }

            string folderPath = string.IsNullOrWhiteSpace(songsFolder)
                ? string.Empty
                : Path.GetFullPath(Path.Combine(songsFolder, folder));

            if (!string.IsNullOrWhiteSpace(folderPath) && Directory.Exists(folderPath))
            {
                string osuPath = Path.Combine(folderPath, filename);
                if (!File.Exists(osuPath))
                    return "{\"ok\":false,\"error\":\"beatmap_file_missing\",\"folder\":\"" + Escape(folder) + "\",\"filename\":\"" + Escape(filename) + "\",\"mapString\":\"" + Escape(mapString) + "\",\"setId\":" + setId + "}";
            }

            return "{\"ok\":true,\"folder\":\"" + Escape(folder) + "\",\"filename\":\"" + Escape(filename) + "\",\"folderPath\":\"" + Escape(folderPath) + "\",\"mapString\":\"" + Escape(mapString) + "\",\"setId\":" + setId + ",\"mapId\":" + mapId + "}";
        }
        finally
        {
            if (hProcess != IntPtr.Zero) CloseHandle(hProcess);
            proc.Dispose();
        }
    }

    static string Escape(string value)
    {
        if (value == null) return string.Empty;
        return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
"@

try {
  $json = [OsuStableBeatmapReader]::Read($SongsFolder)
  Write-Output $json
} catch {
  $msg = $_.Exception.Message.Replace('"', '\\"')
  Write-Output "{`"ok`":false,`"error`":`"$msg`"}"
}
