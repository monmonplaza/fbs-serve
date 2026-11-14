<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Process\Process;

/**
 * Runs the app for phones on the same Wi-Fi: `php artisan serve:wifi`.
 * - Finds this computer's current Wi-Fi address (the router can change it) and uses it as APP_URL, so QR codes point to it.
 * - Serves the built files and rebuilds them when the source is newer; public/hot from `npm run dev` is ignored, because it
 *   points phones at an address they cannot reach.
 * - Uses 8 workers, so several phones can use the app at once.
 */
class ServeWifi extends Command
{
    protected $signature = 'serve:wifi {--port=8000} {--workers=8}';

    protected $description = 'Serve the app to phones on the same Wi-Fi, using this computer\'s current address';

    public function handle(): int
    {
        $ip = $this->lanAddress();
        if ($ip === null) {
            $this->error('No Wi-Fi address found. Connect this computer to the Wi-Fi first.');

            return self::FAILURE;
        }
        $port = (int) $this->option('port');
        $this->buildIfStale();

        foreach (['APP_URL' => "http://{$ip}:{$port}", 'VITE_USE_BUILD' => 'true', 'PHP_CLI_SERVER_WORKERS' => (string) max(1, (int) $this->option('workers'))] as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $_SERVER[$key] = $value;
        }
        $this->info("Phones on the same Wi-Fi: open http://{$ip}:{$port}");

        return $this->call('serve', ['--no-reload' => true, '--host' => '0.0.0.0', '--port' => $port]);
    }

    /** The address other devices on the network reach this computer at. No packet is sent: the socket only picks a route. */
    private function lanAddress(): ?string
    {
        if (function_exists('socket_create') && ($s = @socket_create(AF_INET, SOCK_DGRAM, SOL_UDP))) {
            $ok = @socket_connect($s, '192.0.2.1', 9) && @socket_getsockname($s, $address);
            socket_close($s);
            if ($ok && filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && ! str_starts_with($address, '127.')) {
                return $address;
            }
        }
        foreach (['ipconfig getifaddr en0', 'ipconfig getifaddr en1', "hostname -I | awk '{print $1}'"] as $command) {
            $address = trim((string) @shell_exec($command.' 2>/dev/null'));
            if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return $address;
            }
        }

        return null;
    }

    private function buildIfStale(): void
    {
        $manifest = public_path('build/manifest.json');
        $built = is_file($manifest) ? filemtime($manifest) : 0;
        $newest = 0;
        foreach (Finder::create()->files()->in([resource_path('js'), resource_path('css')]) as $file) {
            $newest = max($newest, $file->getMTime());
        }
        if ($built >= $newest) {
            return;
        }
        $this->info('The app changed since the last build. Building...');
        $process = Process::fromShellCommandline('npm run build', base_path());
        $process->setTimeout(600)->run();
        $process->isSuccessful()
            ? $this->info('Built.')
            : $this->warn('The build failed, so phones get the previous build. Run `npm run build` to see the error.');
    }
}
