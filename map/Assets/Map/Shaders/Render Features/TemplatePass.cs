// ScriptableRenderPass template created for URP 12 and Unity 2021.2
// Made by Alexander Ameye
// https://alexanderameye.github.io/

using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class TemplatePass : ScriptableRenderPass
{
    // The profiler tag that will show up in the frame debugger.
    const string ProfilerTag = "Template Pass";

    // We will store our pass settings in this variable.
    TemplateFeature.PassSettings passSettings;

    RenderTargetIdentifier colorBuffer,
        temporaryBuffer,
        temporaryBuffer2;
    int temporaryBufferID = Shader.PropertyToID("_TemporaryBuffer");

    Material material;

    // It is good to cache the shader property IDs here.
    static readonly int rBlurStrengthProperty = Shader.PropertyToID("_rBlurStrength");
    static readonly int gBlurStrengthProperty = Shader.PropertyToID("_gBlurStrength");
    static readonly int bBlurStrengthProperty = Shader.PropertyToID("_bBlurStrength");
    static readonly int aBlurStrengthProperty = Shader.PropertyToID("_aBlurStrength");

    // The constructor of the pass. Here you can set any material properties that do not need to be updated on a per-frame basis.
    public TemplatePass(TemplateFeature.PassSettings passSettings)
    {
        this.passSettings = passSettings;

        // Set the render pass event.
        renderPassEvent = passSettings.renderPassEvent;

        // We create a material that will be used during our pass. You can do it like this using the 'CreateEngineMaterial' method, giving it
        // a shader path as an input or you can use a 'public Material material;' field in your pass settings and access it here through 'passSettings.material'.
        if (material == null)
            material = CoreUtils.CreateEngineMaterial("Hidden/Box Blur");

        // Set any material properties based on our pass settings.
        material.SetInt(rBlurStrengthProperty, passSettings.rBlurStrength);
        material.SetInt(gBlurStrengthProperty, passSettings.gBlurStrength);
        material.SetInt(bBlurStrengthProperty, passSettings.bBlurStrength);
        material.SetInt(aBlurStrengthProperty, passSettings.aBlurStrength);
    }

    // Gets called by the renderer before executing the pass.
    // Can be used to configure render targets and their clearing state.
    // Can be user to create temporary render target textures.
    // If this method is not overriden, the render pass will render to the active camera render target.
    public override void OnCameraSetup(CommandBuffer cmd, ref RenderingData renderingData)
    {
        // Grab the camera target descriptor. We will use this when creating a temporary render texture.
        RenderTextureDescriptor descriptor = renderingData.cameraData.cameraTargetDescriptor;

        // Downsample the original camera target descriptor.
        // You would do this for performance reasons or less commonly, for aesthetics.
        descriptor.width /= passSettings.downsample;
        descriptor.height /= passSettings.downsample;

        // Set the number of depth bits we need for our temporary render texture.
        descriptor.depthBufferBits = 0;

        // Enable these if your pass requires access to the CameraDepthTexture or the CameraNormalsTexture.
        // ConfigureInput(ScriptableRenderPassInput.Depth);
        // ConfigureInput(ScriptableRenderPassInput.Normal);

        // Grab the color buffer from the renderer camera color target.
        colorBuffer = renderingData.cameraData.renderer.cameraColorTarget;

        // Create a temporary render texture using the descriptor from above.
        cmd.GetTemporaryRT(temporaryBufferID, descriptor, FilterMode.Bilinear);
        temporaryBuffer = new RenderTargetIdentifier(temporaryBufferID);
        cmd.GetTemporaryRT(temporaryBufferID + 1, descriptor, FilterMode.Bilinear);
        temporaryBuffer2 = new RenderTargetIdentifier(temporaryBufferID + 1);
    }

    // The actual execution of the pass. This is where custom rendering occurs.
    public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
    {
        // Grab a command buffer. We put the actual execution of the pass inside of a profiling scope.
        CommandBuffer cmd = CommandBufferPool.Get();
        using (new ProfilingScope(cmd, new ProfilingSampler(ProfilerTag)))
        {
            // Blit from the color buffer to a temporary buffer and back. This is needed for a two-pass shader.
            Blit(cmd, colorBuffer, temporaryBuffer);
            Blit(cmd, temporaryBuffer, temporaryBuffer2, material, 0); // shader pass 0
            Blit(cmd, temporaryBuffer2, colorBuffer, material, 1); // shader pass 1
        }

        // Execute the command buffer and release it.
        context.ExecuteCommandBuffer(cmd);
        CommandBufferPool.Release(cmd);
    }

    // Called when the camera has finished rendering.
    // Here we release/cleanup any allocated resources that were created by this pass.
    // Gets called for all cameras i na camera stack.
    public override void OnCameraCleanup(CommandBuffer cmd)
    {
        if (cmd == null)
            throw new ArgumentNullException("cmd");

        // Since we created a temporary render texture in OnCameraSetup, we need to release the memory here to avoid a leak.
        cmd.ReleaseTemporaryRT(temporaryBufferID);
        cmd.ReleaseTemporaryRT(temporaryBufferID + 1);
    }
}
