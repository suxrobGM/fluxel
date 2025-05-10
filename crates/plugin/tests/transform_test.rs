use swc_core::ecma::{transforms::testing::test, visit::visit_mut_pass};
use swc_plugin_fluxel;

test!(
    Default::default(),
    |_| visit_mut_pass(swc_plugin_fluxel::FluxelTransform),
    boo,
    r#"foo === bar;"#
);
