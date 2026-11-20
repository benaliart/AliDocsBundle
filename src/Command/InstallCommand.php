<?php

namespace Aliarteo\AliDocsBundle\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Filesystem\Filesystem;

/**
 * Creates the configuration and the routes files of the bundle in the application :
 * - config/packages/ali_docs.yaml
 * - config/routes/ali_docs.yaml
 * Existing files are kept (use --force to replace them).
 */
#[AsCommand(
    name: 'ali-docs:install',
    description: 'Create the AliDocsBundle configuration and routes files in the application',
)]
class InstallCommand extends Command
{
    private const FILES = [
        'config/packages/ali_docs.yaml',
        'config/routes/ali_docs.yaml',
    ];

    public function __construct(
        private string $projectDir,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('force', 'f', InputOption::VALUE_NONE, 'Replace the existing files');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('AliDocsBundle installation');

        $filesystem = new Filesystem();
        $bundleDir = \dirname(__DIR__, 2);
        $force = (bool) $input->getOption('force');

        foreach (self::FILES as $file) {
            $target = $this->projectDir . '/' . $file;

            if ($filesystem->exists($target) && !$force) {
                $io->writeln(sprintf(' <comment>skipped</comment>  %s (already exists, use --force to replace it)', $file));
                continue;
            }

            $filesystem->copy($bundleDir . '/' . $file, $target, true);
            $io->writeln(sprintf(' <info>created</info>  %s', $file));
        }

        $io->success('Done. Configure your documentations in config/packages/ali_docs.yaml');

        return Command::SUCCESS;
    }
}
