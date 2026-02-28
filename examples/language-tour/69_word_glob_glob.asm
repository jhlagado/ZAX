; ZAX lowered .asm trace
; range: $0100..$2012 (end exclusive)

; func word_glob_glob begin
word_glob_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (glob_idx_word)         ; 010B: 2A 00 00
push HL                        ; 010E: E5
pop HL                         ; 010F: E1
add HL, HL                     ; 0110: 29
push HL                        ; 0111: E5
ld HL, glob_words              ; 0112: 21 00 00
pop DE                         ; 0115: D1
add HL, DE                     ; 0116: 19
push HL                        ; 0117: E5
pop HL                         ; 0118: E1
push AF                        ; 0119: F5
ld A, (HL)                     ; 011A: 7E
inc HL                         ; 011B: 23
ld H, (HL)                     ; 011C: 66
ld L, A                        ; 011D: 6F
pop AF                         ; 011E: F1
ld HL, (glob_idx_word)         ; 011F: 2A 00 00
push HL                        ; 0122: E5
pop HL                         ; 0123: E1
add HL, HL                     ; 0124: 29
push HL                        ; 0125: E5
ld HL, glob_words              ; 0126: 21 00 00
pop DE                         ; 0129: D1
add HL, DE                     ; 012A: 19
push HL                        ; 012B: E5
pop HL                         ; 012C: E1
ex DE, HL                      ; 012D: EB
ld (hl), e                     ; 012E: 73
inc HL                         ; 012F: 23
ld (hl), d                     ; 0130: 72
ex DE, HL                      ; 0131: EB
__zax_epilogue_0:
pop DE                         ; 0132: D1
pop BC                         ; 0133: C1
pop AF                         ; 0134: F1
ld SP, IX                      ; 0135: DD F9
pop IX                         ; 0137: DD E1
ret                            ; 0139: C9
; func main begin
; func word_glob_glob end
main:
push IX                        ; 013A: DD E5
ld IX, $0000                   ; 013C: DD 21 00 00
add IX, SP                     ; 0140: DD 39
push AF                        ; 0142: F5
push BC                        ; 0143: C5
push DE                        ; 0144: D5
push HL                        ; 0145: E5
call word_glob_glob            ; 0146: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0149: E1
pop DE                         ; 014A: D1
pop BC                         ; 014B: C1
pop AF                         ; 014C: F1
ld SP, IX                      ; 014D: DD F9
pop IX                         ; 014F: DD E1
ret                            ; 0151: C9
; func main end

; symbols:
; label word_glob_glob = $0100
; label __zax_epilogue_0 = $0132
; label main = $013A
; label __zax_epilogue_1 = $0149
; data glob_words = $2000
; data glob_idx_word = $2010
