<?php

namespace Aliarteo\AliDocsBundle\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\PositiveOrZero;
use Symfony\Component\Validator\Constraints\Regex;

/**
 * Edition of a page : the file name is "{position}__{title}.md"
 */
class MarkdownEditorType extends AbstractType
{
    /**
     * Names of the pages and folders (used as file names) : letters (accents included), numbers, spaces, underscores and dashes
     */
    public const NAME_PATTERN = '/^[\p{L}\p{N} _-]+$/u';
    public const NAME_MAX_LENGTH = 100;
    public const CONTENT_MAX_LENGTH = 50000;

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('position', IntegerType::class, [
                'label' => 'Page position',
                'required' => true,
                'constraints' => [
                    new NotBlank(),
                    new PositiveOrZero(),
                ],
            ])
            ->add('title', TextType::class, [
                'label' => 'Page name',
                'required' => true,
                'attr' => [
                    'placeholder' => 'Page title',
                    'maxlength' => self::NAME_MAX_LENGTH,
                ],
                'constraints' => [
                    new NotBlank(),
                    new Length(max: self::NAME_MAX_LENGTH),
                    // Used as file name : letters (accents included), numbers, spaces, underscores and dashes only
                    new Regex(
                        pattern: self::NAME_PATTERN,
                        message: 'The page name can only contain letters, numbers, spaces, underscores or dashes.',
                    ),
                ],
            ])
            ->add('content', TextareaType::class, [
                'label' => 'Markdown content',
                'required' => false,
                // The Markdown of the file is kept as is (no trim : spaces at the end of the lines are line breaks)
                'trim' => false,
                'empty_data' => '',
                'attr' => [
                    'class' => 'ali-docs-editor-input',
                    'rows' => 20,
                    'spellcheck' => 'true',
                ],
                'constraints' => [
                    new Length(
                        max: self::CONTENT_MAX_LENGTH,
                        maxMessage: 'The content is too long (max {{ limit }} characters).',
                    ),
                ],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'translation_domain' => 'ali_docs',
            // CSRF token stored in the session : the pages do not depend on the CSRF script of the application
            'csrf_token_id' => 'ali_docs_edit',
        ]);
    }
}
