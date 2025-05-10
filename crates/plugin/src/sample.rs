//! Fluxel SWC transform – converts default‑exported TSX function to a Web Component class.
//! Build with: `cargo build --release --target wasm32-wasip1`

use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Fold, FoldWith, VisitMut, VisitMutWith, as_folder};
use swc_core::plugin::metadata::TransformPluginProgramMetadata;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

struct FluxelTransform;

impl VisitMut for FluxelTransform {
    fn visit_mut_module(&mut self, m: &mut Module) {
        // 1. find default export that is a function decl or ident referring to fn
        let mut default_fn_name: Option<Id> = None;
        let mut stmt_idx: Option<usize> = None;

        for (i, item) in m.body.iter().enumerate() {
            if let ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(export)) = item {
                stmt_idx = Some(i);
                match &export.decl {
                    DefaultDecl::Fn(expr) => {
                        default_fn_name = expr.ident.as_ref().map(|id| id.to_id());
                    }
                    DefaultDecl::Ident(ident) => {
                        default_fn_name = Some(ident.to_id());
                    }
                    _ => (),
                }
            }
        }

        let fn_id = match default_fn_name {
            Some(id) => id,
            None => return, // nothing to transform
        };

        // 2. Build a kebab‑case tag name `fluxel-<component>`
        let tag_name = format!(
            "fluxel-{}",
            fn_id
                .0
                .to_string()
                .chars()
                .flat_map(|c| {
                    if c.is_uppercase() {
                        vec!['-', c.to_ascii_lowercase()] // camelCase -> kebab
                    } else {
                        vec![c]
                    }
                })
                .collect::<String>()
                .trim_start_matches('-')
        );

        // 3. Build: class <FnName>Element extends HTMLElement { constructor() { ... } }
        let class_ident = Ident::new(format!("{}Element", fn_id.0).into(), DUMMY_SP);

        // constructor body: const node = <FnName>(this); this.attachShadow({mode:'open'}).appendChild(node);
        let ctor_body = vec![
            // const __props = {}; // placeholder for attr->prop mapping (later)
            Stmt::Decl(Decl::Var(Box::new(VarDecl {
                span: DUMMY_SP,
                kind: VarDeclKind::Const,
                declare: false,
                decls: vec![VarDeclarator {
                    span: DUMMY_SP,
                    name: Pat::Ident(BindingIdent::from(Ident::new("__props".into(), DUMMY_SP))),
                    init: Some(Box::new(Expr::Object(ObjectLit {
                        span: DUMMY_SP,
                        props: vec![],
                    }))),
                    definite: false,
                }],
            }))),
            // const _n = <FnName>(__props);
            Stmt::Decl(Decl::Var(Box::new(VarDecl {
                span: DUMMY_SP,
                kind: VarDeclKind::Const,
                declare: false,
                decls: vec![VarDeclarator {
                    span: DUMMY_SP,
                    name: Pat::Ident(BindingIdent::from(Ident::new("_n".into(), DUMMY_SP))),
                    init: Some(Box::new(Expr::Call(CallExpr {
                        span: DUMMY_SP,
                        callee: Callee::Expr(Box::new(Expr::Ident(Ident::new(
                            fn_id.0.clone(),
                            DUMMY_SP,
                        )))),
                        args: vec![ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Ident(Ident::new("__props".into(), DUMMY_SP))),
                        }],
                        type_args: None,
                    }))),
                    definite: false,
                }],
            }))),
            // this.attachShadow({mode:'open'}).appendChild(_n);
            Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Call(CallExpr {
                    span: DUMMY_SP,
                    callee: MemberExpr {
                        span: DUMMY_SP,
                        obj: Box::new(Expr::Call(CallExpr {
                            span: DUMMY_SP,
                            callee: MemberExpr {
                                span: DUMMY_SP,
                                obj: ThisExpr { span: DUMMY_SP }.into(),
                                prop: Ident::new("attachShadow".into(), DUMMY_SP).into(),
                                computed: false,
                            }
                            .as_callee(),
                            args: vec![ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Object(ObjectLit {
                                    span: DUMMY_SP,
                                    props: vec![PropOrSpread::Prop(Box::new(Prop::KeyValue(
                                        KeyValueProp {
                                            key: PropName::Ident(Ident::new(
                                                "mode".into(),
                                                DUMMY_SP,
                                            )),
                                            value: Box::new(Expr::Lit(Lit::Str(tag!("open")))),
                                        },
                                    )))],
                                })),
                            }],
                            type_args: None,
                        }))
                        .into(),
                        prop: Ident::new("appendChild".into(), DUMMY_SP).into(),
                        computed: false,
                    }
                    .as_callee(),
                    args: vec![ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Ident(Ident::new("_n".into(), DUMMY_SP))),
                    }],
                    type_args: None,
                })),
            }),
        ];

        let ctor = Constructor {
            span: DUMMY_SP,
            key: PropName::Ident(Ident::new("constructor".into(), DUMMY_SP)),
            params: vec![],
            body: Some(BlockStmt {
                span: DUMMY_SP,
                stmts: ctor_body,
            }),
            accessibility: None,
            is_optional: false,
        };

        let class_decl = ModuleItem::Stmt(Stmt::Decl(Decl::Class(Box::new(ClassDecl {
            ident: class_ident.clone(),
            declare: false,
            class: Class {
                span: DUMMY_SP,
                decorators: vec![],
                body: vec![ClassMember::Constructor(ctor)],
                super_class: Some(Box::new(Expr::Ident(Ident::new(
                    "HTMLElement".into(),
                    DUMMY_SP,
                )))),
                is_abstract: false,
                type_params: None,
                super_type_params: None,
                implements: vec![],
            },
        }))));

        // 4. customElements.define('<tag>', <Class>)
        let define_call = ModuleItem::Stmt(Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: MemberExpr {
                    span: DUMMY_SP,
                    obj: Ident::new("customElements".into(), DUMMY_SP).into(),
                    prop: Ident::new("define".into(), DUMMY_SP).into(),
                    computed: false,
                }
                .as_callee(),
                args: vec![
                    ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Lit(Lit::Str(tag!(tag_name)))),
                    },
                    ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Ident(class_ident.clone())),
                    },
                ],
                type_args: None,
            })),
        }));

        // 5. Replace original default export with classDecl + define call + export default class
        if let Some(i) = stmt_idx {
            m.body.splice(
                i..=i,
                vec![
                    class_decl,
                    define_call,
                    ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(ExportDefaultDecl {
                        span: DUMMY_SP,
                        decl: DefaultDecl::Ident(class_ident),
                    })),
                ],
            );
        }
    }
}

#[plugin_transform]
pub fn fluxel_plugin(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    program.fold_with(&mut as_folder(FluxelTransform))
}
