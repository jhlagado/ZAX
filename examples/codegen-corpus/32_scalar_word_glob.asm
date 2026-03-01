; ZAX lowered .asm trace
; range: $0100..$2002 (end exclusive)

; func touch_scalar_word_glob begin
touch_scalar_word_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (glob_w)                ; 010B: 2A 00 00
ld (glob_w), HL                ; 010E: 22 00 00
__zax_epilogue_0:
pop DE                         ; 0111: D1
pop BC                         ; 0112: C1
pop AF                         ; 0113: F1
ld SP, IX                      ; 0114: DD F9
pop IX                         ; 0116: DD E1
ret                            ; 0118: C9
; func main begin
; func touch_scalar_word_glob end
main:
push IX                        ; 0119: DD E5
ld IX, $0000                   ; 011B: DD 21 00 00
add IX, SP                     ; 011F: DD 39
push AF                        ; 0121: F5
push BC                        ; 0122: C5
push DE                        ; 0123: D5
push HL                        ; 0124: E5
call touch_scalar_word_glob    ; 0125: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0128: E1
pop DE                         ; 0129: D1
pop BC                         ; 012A: C1
pop AF                         ; 012B: F1
ld SP, IX                      ; 012C: DD F9
pop IX                         ; 012E: DD E1
ret                            ; 0130: C9
; func main end

; symbols:
; label touch_scalar_word_glob = $0100
; label __zax_epilogue_0 = $0111
; label main = $0119
; label __zax_epilogue_1 = $0128
; data glob_w = $2000
