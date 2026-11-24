<?php

namespace Aliarteo\AliDocsBundle;

use Symfony\Component\Config\Definition\Configurator\DefinitionConfigurator;
use Symfony\Component\Config\Definition\Exception\InvalidConfigurationException;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

/**
 * The configuration (config/packages/ali_docs.yaml) and the routes (config/routes/ali_docs.yaml)
 * of the application are created with the command : php bin/console ali-docs:install
 */
class AliDocsBundle extends AbstractBundle
{
    public const CONFIG_KEY = 'ali_docs';

    /**
     * Roles refused for the edition : editing writes files on the server
     */
    private const FORBIDDEN_EDIT_ROLES = ['PUBLIC_ACCESS', 'IS_AUTHENTICATED_ANONYMOUSLY'];

    public function configure(DefinitionConfigurator $definition): void
    {
        $definition->rootNode()
            ->children()
                ->scalarNode('admin_path')
                    ->info('Url prefix of the edit pages.')
                    ->defaultValue('admin_documentation')
                ->end()
                ->scalarNode('upload_max_size')
                    ->info('Maximum size of a media file sent from the editor (ex : "64M", "500K"). The PHP limits (upload_max_filesize, post_max_size) also apply.')
                    ->defaultValue('64M')
                    ->validate()
                        ->ifTrue(static fn ($value): bool => !preg_match('/^\d+\s*[KMG]?$/i', (string) $value))
                        ->thenInvalid('Invalid size %s : use a number of bytes, or a number followed by K, M or G (ex : "64M").')
                    ->end()
                ->end()
                ->arrayNode('layout')
                    ->info('The documentation pages have their own layout, independent of the application. These options connect them to the application.')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->scalarNode('home_url')
                            ->info('Url of the link back to the application, in the header (ex : "/"). Empty : no link.')
                            ->defaultNull()
                        ->end()
                        ->scalarNode('home_label')
                            ->info('Text of the link back to the application. Empty : "Home" (translated).')
                            ->defaultNull()
                        ->end()
                        ->scalarNode('favicon')
                            ->info('Favicon url or path (ex : "/favicon.ico").')
                            ->defaultNull()
                        ->end()
                        ->scalarNode('logo')
                            ->info('Logo of the application displayed in the header, instead of the default icon : url or path (ex : "/images/logo.svg"). Empty : default icon.')
                            ->defaultNull()
                        ->end()
                        ->arrayNode('extra_css')
                            ->info('Stylesheets of the application added to the pages (ex : to change the colors).')
                            ->scalarPrototype()->end()
                            ->defaultValue([])
                        ->end()
                        ->arrayNode('extra_js')
                            ->info('Scripts of the application added to the pages (ex : statistics).')
                            ->scalarPrototype()->end()
                            ->defaultValue([])
                        ->end()
                    ->end()
                ->end()
                ->arrayNode('documentations')
                    ->info('One entry per documentation. The key is the url of the documentation (ex : doc-public => /doc-public) : letters, numbers, "-" and "_".')
                    // The key is the url : kept as written (Symfony would replace the "-" by "_")
                    ->normalizeKeys(false)
                    ->defaultValue([])
                    ->arrayPrototype()
                        ->children()
                            ->scalarNode('doc_dir')
                                ->info('Folder of the documentation files (ex : "%kernel.project_dir%/doc-public").')
                                ->isRequired()
                                ->cannotBeEmpty()
                            ->end()
                            ->scalarNode('title')
                                ->info('Title displayed in the header.')
                                ->defaultValue('My Documentation')
                            ->end()
                            ->scalarNode('edit_security')
                                ->info('Role required to edit the pages. Required : editing writes files on the server.')
                                ->defaultValue('ROLE_ADMIN')
                                ->cannotBeEmpty()
                                ->validate()
                                    ->ifInArray(self::FORBIDDEN_EDIT_ROLES)
                                    ->thenInvalid('The edition can not be public (%s) : it writes files on the server. Use a role, ex : ROLE_ADMIN.')
                                ->end()
                            ->end()
                            ->scalarNode('view_security')
                                ->info('Role required to read the documentation (empty or PUBLIC_ACCESS : public)')
                                ->defaultValue('')
                            ->end()
                            ->arrayNode('switch_doc')
                                ->info('Keys of the other documentations displayed in the "Go to documentation" menu, or "*" for all the other documentations. Only the documentations the user can read are displayed.')
                                ->scalarPrototype()->end()
                                ->defaultValue([])
                            ->end()
                        ->end()
                    ->end()
                ->end()
            ->end()
        ;
    }

    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $container->import('../config/services.yaml');

        $container->parameters()
            ->set('ali_docs.admin_path', $config['admin_path'])
            ->set('ali_docs.upload_max_size', $this->toBytes((string) $config['upload_max_size']))
            ->set('ali_docs.layout', $config['layout'])
            ->set('ali_docs.documentations', $this->resolveSwitchDocs($config['documentations']))
        ;
    }

    /**
     * Keys of the documentations (used in the urls) and switch_doc of each documentation
     * - key : letters, numbers, "-" and "_", starting with a letter or a number
     * - switch_doc : keys of the other documentations, or "*" for all the other ones (in the configuration order).
     *   Unknown key : configuration error. The current documentation is removed
     *
     * @param array<string, array<string, mixed>> $documentations
     * @return array<string, array<string, mixed>>
     */
    private function resolveSwitchDocs(array $documentations): array
    {
        $allKeys = array_map('strval', array_keys($documentations));

        foreach ($allKeys as $key) {
            if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/', $key)) {
                throw new InvalidConfigurationException(sprintf(
                    'Invalid documentation key "%s" in "ali_docs.documentations": the key is the url of the documentation, use letters, numbers, "-" and "_" (ex: "doc-public").',
                    $key
                ));
            }
        }

        foreach ($documentations as $key => $documentation) {
            $key = (string) $key;
            $switchDocs = array_map('strval', $documentation['switch_doc'] ?? []);

            if (\in_array('*', $switchDocs, true)) {
                $switchDocs = $allKeys;
            }

            foreach ($switchDocs as $switchDoc) {
                if (!\in_array($switchDoc, $allKeys, true)) {
                    throw new InvalidConfigurationException(sprintf(
                        'Unknown documentation "%s" in "ali_docs.documentations.%s.switch_doc". Available: %s, "*".',
                        $switchDoc,
                        $key,
                        implode(', ', $allKeys)
                    ));
                }
            }

            $documentations[$key]['switch_doc'] = array_values(array_unique(array_diff($switchDocs, [$key])));
        }

        return $documentations;
    }

    /**
     * Size of the configuration (ex : "64M") => number of bytes
     */
    private function toBytes(string $size): int
    {
        $size = strtoupper(trim($size));
        $units = ['K' => 1024, 'M' => 1024 ** 2, 'G' => 1024 ** 3];
        $unit = substr($size, -1);

        return isset($units[$unit]) ? (int) rtrim(substr($size, 0, -1)) * $units[$unit] : (int) $size;
    }

    /**
     * Retrieve the path of this bundle (ex : /path/SfApp/AliDocsBundle)
     */
    public function getBundlePath(): string
    {
        return $this->getPath();
    }
}
