package ai.maximo.ideaslab.ui.theme

import androidx.compose.animation.core.tween
import androidx.compose.ui.unit.IntOffset

object Motion {
    fun duration(level: Int): Int = when(level) { 0->0; 1->150; 2->200; else->300 }
    fun <T> spec(level: Int) = tween<T>(durationMillis = duration(level))
}
